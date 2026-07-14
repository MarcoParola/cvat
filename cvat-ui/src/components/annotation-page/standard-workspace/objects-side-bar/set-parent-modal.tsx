// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useMemo, useState, useEffect } from 'react';
import Modal from 'antd/lib/modal';
import Select from 'antd/lib/select';
import notification from 'antd/lib/notification';
import { ObjectState } from 'cvat-core-wrapper';

interface Props {
    objectState: ObjectState;
    objectStates?: ObjectState[];
    visible: boolean;
    onClose: () => void;
    readonly states: ObjectState[];
    updateObjectState?: (objectState: ObjectState) => void;
    updateObjectStates?: (objectStates: ObjectState[]) => void;
    jobInstance: any;
}

function SetParentModal(props: Props): JSX.Element {
    const {
        objectState, objectStates, visible, onClose, states, updateObjectState, updateObjectStates,
    } = props;
    const targetStates = useMemo(
        (): ObjectState[] => (objectStates?.length ? objectStates : [objectState]),
        [objectState, objectStates],
    );
    const targetStateIDs = useMemo(
        (): Set<number | null> => new Set(targetStates.map((state: ObjectState) => state.clientID)),
        [targetStates],
    );
    const multiple = targetStates.length > 1;

    // Use clientID for in-session selection; resolve to serverID for persistence
    const [selectedParentClientID, setSelectedParentClientID] = useState<number | null | undefined>(null);
    const [validParents, setValidParents] = useState<ObjectState[]>([]);

    useEffect(() => {
        if (visible && targetStates.length) {
            const currentFrame = objectState.frame;

            // Resolve current parentID (serverID) back to clientID for display.
            // For bulk edits, show the current parent only if every target shares it.
            let currentParentClientID: number | null | undefined = null;
            const currentParentIDs = new Set(targetStates.map((state: ObjectState) => state.parentID));
            if (currentParentIDs.size > 1) {
                currentParentClientID = undefined;
            } else if (objectState.parentID !== null) {
                // parentID stores serverID; find the matching state
                const parentState = states.find(
                    (s: ObjectState) => s.serverID === objectState.parentID,
                );
                currentParentClientID = parentState ? parentState.clientID : null;
            }

            // Function to check if a candidate would create a circular reference
            const wouldCreateCircularRef = (candidateClientID: number): boolean => {
                if (targetStateIDs.has(candidateClientID)) return true;

                let current = states.find((s: ObjectState) => s.clientID === candidateClientID);
                const visitedIDs = new Set<number>([candidateClientID]);

                while (current && current.parentID !== null) {
                    // parentID stores serverID, find matching state
                    const parentState = states.find(
                        (s: ObjectState) => s.serverID === current?.parentID,
                    );
                    if (!parentState) break;
                    if (targetStateIDs.has(parentState.clientID)) {
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

            const allowedObjectTypes = new Set(targetStates.map((state: ObjectState) => state.objectType));

            // Filter states that:
            // 1. Are on the same frame as the targets
            // 2. Are not one of the target objects
            // 3. Would not create circular references
            // 4. Are same object type as the targets
            // NOTE: No serverID filter - all annotations are shown immediately
            const candidates = states.filter((state: ObjectState) =>
                state.frame === currentFrame &&
                !targetStateIDs.has(state.clientID) &&
                !wouldCreateCircularRef(state.clientID) &&
                allowedObjectTypes.size === 1 &&
                state.objectType === objectState.objectType,
            );

            setValidParents(candidates);
            setSelectedParentClientID(currentParentClientID);
        }
    }, [visible, objectState, states, targetStateIDs, targetStates]);

    const handleOk = async (): Promise<void> => {
        if (typeof selectedParentClientID === 'undefined') {
            return;
        }

        try {
            if (selectedParentClientID !== null) {
                // Find the selected parent and resolve clientID → serverID
                const parentState = states.find(
                    (s: ObjectState) => s.clientID === selectedParentClientID,
                );
                if (parentState && parentState.serverID !== null) {
                    targetStates.forEach((state: ObjectState) => {
                        state.parentID = parentState.serverID;
                    });
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
                targetStates.forEach((state: ObjectState) => {
                    state.parentID = null;
                });
            }

            // Save the changes through Redux update
            if (updateObjectStates) {
                await updateObjectStates(targetStates);
            } else if (updateObjectState) {
                await updateObjectState(objectState);
            }

            const parentLabel = selectedParentClientID !== null
                ? states.find((s: ObjectState) => s.clientID === selectedParentClientID)
                : null;

            notification.success({
                message: multiple ? 'Parent relationships updated' : 'Parent relationship updated',
                description: selectedParentClientID === null
                    ? `Parent relationship removed${multiple ? ` for ${targetStates.length} objects` : ''}`
                    : `Parent set to ${parentLabel ? parentLabel.label.name : ''} (#${selectedParentClientID})${
                        multiple ? ` for ${targetStates.length} objects` : ''
                    }`,
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
            title={multiple ? `Set Parent Object for ${targetStates.length} Objects` : 'Set Parent Object'}
            visible={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            okText='Set Parent'
            okButtonProps={{ disabled: typeof selectedParentClientID === 'undefined' }}
            className='cvat-set-parent-modal'
        >
            <div>
                <p>
                    {multiple ?
                        'Select a parent object for the selected annotations.' :
                        'Select a parent object for this annotation.'}
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
