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

    // Use clientID for in-session selection; resolve to serverID for persistence
    const [selectedParentClientID, setSelectedParentClientID] = useState<number | null>(null);
    const [validParents, setValidParents] = useState<ObjectState[]>([]);

    useEffect(() => {
        if (visible) {
            const currentFrame = objectState.frame;

            // Resolve current parentID (serverID) back to clientID for display
            let currentParentClientID: number | null = null;
            if (objectState.parentID !== null) {
                // parentID stores serverID; find the matching state
                const parentState = states.find(
                    (s: ObjectState) => s.serverID === objectState.parentID,
                );
                currentParentClientID = parentState ? parentState.clientID : null;
            }

            // Function to check if a candidate would create a circular reference
            const wouldCreateCircularRef = (candidateClientID: number): boolean => {
                if (candidateClientID === objectState.clientID) return true;

                let current = states.find((s: ObjectState) => s.clientID === candidateClientID);
                const visitedIDs = new Set<number>([candidateClientID]);

                while (current && current.parentID !== null) {
                    // parentID stores serverID, find matching state
                    const parentState = states.find(
                        (s: ObjectState) => s.serverID === current?.parentID,
                    );
                    if (!parentState) break;
                    if (parentState.clientID === objectState.clientID) {
                        return true; // circular reference detected
                    }
                    if (visitedIDs.has(parentState.clientID)) {
                        return true; // already visited, circular ref
                    }
                    visitedIDs.add(parentState.clientID);
                    current = parentState;
                }

                return false;
            };

            // Filter states that:
            // 1. Are on the same frame
            // 2. Are not the current object itself
            // 3. Would not create circular references
            // 4. Are same object type
            // NOTE: No serverID filter - all annotations are shown immediately
            const candidates = states.filter((state: ObjectState) =>
                state.frame === currentFrame &&
                state.clientID !== objectState.clientID &&
                !wouldCreateCircularRef(state.clientID) &&
                state.objectType === objectState.objectType,
            );

            setValidParents(candidates);
            setSelectedParentClientID(currentParentClientID);
        }
    }, [visible, objectState, states]);

    const handleOk = async (): Promise<void> => {
        try {
            if (selectedParentClientID !== null) {
                // Find the selected parent and resolve clientID → serverID
                const parentState = states.find(
                    (s: ObjectState) => s.clientID === selectedParentClientID,
                );
                if (parentState && parentState.serverID !== null) {
                    objectState.parentID = parentState.serverID;
                } else {
                    // Parent not saved yet - warn user
                    notification.warning({
                        message: 'Parent not saved yet',
                        description: 'Please save annotations first (Ctrl+S), then set the parent.',
                    });
                    return;
                }
            } else {
                // Clear parent
                objectState.parentID = null;
            }

            // Save the changes through Redux update
            await updateObjectState(objectState);

            const parentLabel = selectedParentClientID !== null
                ? states.find((s: ObjectState) => s.clientID === selectedParentClientID)
                : null;

            notification.success({
                message: 'Parent relationship updated',
                description: selectedParentClientID === null
                    ? 'Parent relationship removed'
                    : `Parent set to ${parentLabel ? parentLabel.label.name : ''} (#${selectedParentClientID})`,
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
                    value={selectedParentClientID}
                    onChange={setSelectedParentClientID}
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
                        <Select.Option value={state.clientID} key={state.clientID}>
                            #{state.clientID} - {state.label.name}
                            {state.serverID !== null ? ` (saved)` : ` (unsaved)`}
                        </Select.Option>
                    ))}
                </Select>
            </div>
        </Modal>
    );
}

export default React.memo(SetParentModal);
