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
}

function SetParentModal(props: Props): JSX.Element {
    const {
        objectState, visible, onClose, states,
    } = props;

    const [selectedParentID, setSelectedParentID] = useState<number | null>(objectState.parentID);
    const [validParents, setValidParents] = useState<ObjectState[]>([]);

    useEffect(() => {
        if (visible) {
            // Filter valid parent candidates
            const currentFrame = objectState.frame;
            const currentClientID = objectState.clientID;

            // Function to check if a candidate would create a circular reference
            const wouldCreateCircularRef = (candidateID: number | null): boolean => {
                if (candidateID === null) return false;
                if (candidateID === currentClientID) return true;

                let currentParent = states.find((s) => s.clientID === candidateID);
                const visitedIDs = new Set([candidateID]);

                while (currentParent && currentParent.parentID !== null) {
                    if (currentParent.parentID === currentClientID) {
                        return true; // circular reference detected
                    }
                    if (visitedIDs.has(currentParent.parentID)) {
                        return true; // already visited, circular ref
                    }
                    visitedIDs.add(currentParent.parentID);
                    currentParent = states.find((s) => s.clientID === currentParent?.parentID);
                }

                return false;
            };

            // Filter states that:
            // 1. Are on the same frame
            // 2. Are not the current object itself
            // 3. Would not create circular references
            // 4. Are not skeleton elements (have parentID for skeleton structure)
            const candidates = states.filter((state) =>
                state.frame === currentFrame &&
                state.clientID !== currentClientID &&
                !wouldCreateCircularRef(state.clientID) &&
                state.objectType === objectState.objectType // same type
            );

            setValidParents(candidates);
            setSelectedParentID(objectState.parentID);
        }
    }, [visible, objectState, states]);

    const handleOk = async (): Promise<void> => {
        try {
            // Create a copy of the object state with the new parent
            const updatedState = {
                ...objectState,
                parentID: selectedParentID,
            };

            // Save the updated state
            await objectState.__internal.save(updatedState);

            notification.success({
                message: 'Parent relationship updated',
                description: selectedParentID === null
                    ? 'Parent relationship removed'
                    : `Parent set to object #${selectedParentID}`,
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
        setSelectedParentID(objectState.parentID);
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
                    value={selectedParentID}
                    onChange={setSelectedParentID}
                    allowClear
                    className='cvat-set-parent-select'
                    filterOption={(input, option) =>
                        option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                    }
                >
                    <Select.Option value={null as any} key='none'>
                        <span style={{ fontStyle: 'italic' }}>None (top-level object)</span>
                    </Select.Option>
                    {validParents.map((state) => (
                        <Select.Option value={state.clientID} key={state.clientID}>
                            #{state.clientID} - {state.label.name}
                            {state.serverID !== null && ` (Server ID: ${state.serverID})`}
                        </Select.Option>
                    ))}
                </Select>
            </div>
        </Modal>
    );
}

export default React.memo(SetParentModal);
