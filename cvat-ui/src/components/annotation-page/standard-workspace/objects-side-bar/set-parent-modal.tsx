// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import Modal from 'antd/lib/modal';
import Select from 'antd/lib/select';
import notification from 'antd/lib/notification';
import { ObjectState } from 'cvat-core-wrapper';

interface Props {
    objectState: ObjectState;
    visible: boolean;
    onClose: () => void;
    readonly states: ObjectState[];
    updateObjectState: (objectState: ObjectState) => void;
    jobInstance: any;
}

function SetParentModal(props: Props): JSX.Element {
    const {
        objectState, visible, onClose, states, updateObjectState,
    } = props;

    // parentID is stored as serverID for persistence
    const [selectedParentServerID, setSelectedParentServerID] = useState<number | null>(objectState.parentID);
    const [validParents, setValidParents] = useState<ObjectState[]>([]);

    useEffect(() => {
        if (visible) {
            const currentFrame = objectState.frame;
            const currentServerID = objectState.serverID;

            // Function to check if a candidate would create a circular reference
            // Uses serverID for parent matching (since parentID stores serverID)
            const wouldCreateCircularRef = (candidateServerID: number | null): boolean => {
                if (candidateServerID === null) return false;
                if (candidateServerID === currentServerID) return true;

                let currentParent = states.find((s: ObjectState) => s.serverID === candidateServerID);
                const visitedIDs = new Set<number>([candidateServerID]);

                while (currentParent && currentParent.parentID !== null) {
                    if (currentParent.parentID === currentServerID) {
                        return true; // circular reference detected
                    }
                    if (visitedIDs.has(currentParent.parentID)) {
                        return true; // already visited, circular ref
                    }
                    visitedIDs.add(currentParent.parentID);
                    currentParent = states.find((s: ObjectState) => s.serverID === currentParent?.parentID);
                }

                return false;
            };

            // Filter states that:
            // 1. Are on the same frame
            // 2. Are not the current object itself
            // 3. Would not create circular references
            // 4. Have a serverID (must be saved before becoming a parent)
            // 5. Are same object type
            const candidates = states.filter((state: ObjectState) =>
                state.frame === currentFrame &&
                state.clientID !== objectState.clientID &&
                state.serverID !== null &&
                !wouldCreateCircularRef(state.serverID) &&
                state.objectType === objectState.objectType,
            );

            setValidParents(candidates);
            setSelectedParentServerID(objectState.parentID);
        }
    }, [visible, objectState, states]);

    const handleOk = async (): Promise<void> => {
        try {
            // Set parentID to the serverID of the selected parent
            objectState.parentID = selectedParentServerID;

            // Save the changes through Redux update
            await updateObjectState(objectState);

            const parentLabel = selectedParentServerID !== null
                ? states.find((s: ObjectState) => s.serverID === selectedParentServerID)
                : null;

            notification.success({
                message: 'Parent relationship updated',
                description: selectedParentServerID === null
                    ? 'Parent relationship removed'
                    : `Parent set to ${parentLabel ? parentLabel.label.name : ''} (ID: ${selectedParentServerID})`,
                className: 'cvat-notification-set-parent-success',
            });

            onClose();
        } catch (error) {
            notification.error({
                message: 'Failed to update parent',
                description: error instanceof Error ? error.message : String(error),
                className: 'cvat-notification-set-parent-failed',
            });
        }
    };

    const handleCancel = (): void => {
        setSelectedParentServerID(objectState.parentID);
        onClose();
    };

    return (
        <Modal
            title='Set Parent Object'
            visible={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            okText='Set Parent'
            className='cvat-set-parent-modal'
        >
            <div>
                <p>
                    Select a parent object for this annotation.
                    The parent must be on the same frame and cannot create circular dependencies.
                </p>
                <Select
                    showSearch
                    style={{ width: '100%' }}
                    placeholder='Select parent object (or none for top-level)'
                    value={selectedParentServerID}
                    onChange={setSelectedParentServerID}
                    allowClear
                    className='cvat-set-parent-select'
                    filterOption={(input: string, option: any) =>
                        option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                    }
                >
                    <Select.Option value={null as any} key='none'>
                        <span style={{ fontStyle: 'italic' }}>None (top-level object)</span>
                    </Select.Option>
                    {validParents.map((state: ObjectState) => (
                        <Select.Option value={state.serverID} key={state.serverID}>
                            #{state.clientID} - {state.label.name} (ID: {state.serverID})
                        </Select.Option>
                    ))}
                </Select>
            </div>
        </Modal>
    );
}

export default React.memo(SetParentModal);
