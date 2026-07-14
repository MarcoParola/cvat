// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';

import Text from 'antd/lib/typography/Text';

import { StatesOrdering, Workspace } from 'reducers';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { ObjectState } from 'cvat-core-wrapper';
import ObjectListHeader from './objects-list-header';
import SetParentModal from './set-parent-modal';

interface Props {
    workspace: Workspace;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    sortedStatesID: number[];
    objectStates: any[];
    visibleSkeletonElements: Record<number, number[]>;
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    showGroundTruth: boolean;
    selectedStateIDs: number[];
    changeStatesOrdering(value: StatesOrdering): void;
    selectAllStates(): void;
    clearSelectedStates(): void;
    changeStateSelection(clientID: number, selected: boolean): void;
    updateObjectStates(objectStates: ObjectState[]): void;
    lockAllStates(): void;
    unlockAllStates(): void;
    collapseAllStates(): void;
    expandAllStates(): void;
    hideAllStates(): void;
    showAllStates(): void;
    changeShowGroundTruth(): void;
}

function ObjectListComponent(props: Props): JSX.Element {
    const {
        workspace,
        statesHidden,
        statesLocked,
        statesCollapsedAll,
        statesOrdering,
        sortedStatesID,
        objectStates,
        visibleSkeletonElements,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        showGroundTruth,
        selectedStateIDs,
        changeStatesOrdering,
        selectAllStates,
        clearSelectedStates,
        changeStateSelection,
        updateObjectStates,
        lockAllStates,
        unlockAllStates,
        collapseAllStates,
        expandAllStates,
        hideAllStates,
        showAllStates,
        changeShowGroundTruth,
    } = props;
    const [setParentModalVisible, setSetParentModalVisible] = useState(false);
    const selectedObjectStates = objectStates.filter(
        (state: ObjectState) => selectedStateIDs.includes(state.clientID as number),
    );
    const selectableObjectStates = objectStates.filter((state: ObjectState) => !state.isGroundTruth);
    const allStatesSelected = !!selectableObjectStates.length &&
        selectedObjectStates.length === selectableObjectStates.length;

    let latestZOrder: number | null = null;
    return (
        <>
            <ObjectListHeader
                workspace={workspace}
                statesHidden={statesHidden}
                statesLocked={statesLocked}
                statesCollapsed={statesCollapsedAll}
                statesOrdering={statesOrdering}
                switchLockAllShortcut={switchLockAllShortcut}
                switchHiddenAllShortcut={switchHiddenAllShortcut}
                showGroundTruth={showGroundTruth}
                count={objectStates.length}
                selectableCount={selectableObjectStates.length}
                selectedCount={selectedObjectStates.length}
                allStatesSelected={allStatesSelected}
                changeStatesOrdering={changeStatesOrdering}
                selectAllStates={selectAllStates}
                clearSelectedStates={clearSelectedStates}
                setParentForSelectedStates={() => setSetParentModalVisible(true)}
                lockAllStates={lockAllStates}
                unlockAllStates={unlockAllStates}
                collapseAllStates={collapseAllStates}
                expandAllStates={expandAllStates}
                hideAllStates={hideAllStates}
                showAllStates={showAllStates}
                changeShowGroundTruth={changeShowGroundTruth}
            />
            <div className='cvat-objects-sidebar-states-list'>
                {sortedStatesID.map(
                    (id: number): JSX.Element => {
                        const object = objectStates.find((state: ObjectState) => state.clientID === id);
                        const zOrder = object?.zOrder || latestZOrder;

                        const renderZLayer = latestZOrder !== zOrder && statesOrdering === StatesOrdering.Z_ORDER;
                        if (renderZLayer) {
                            latestZOrder = zOrder;
                        }

                        return (
                            <React.Fragment key={id}>
                                {renderZLayer && (
                                    <div className='cvat-objects-sidebar-z-layer-mark'>
                                        <Text strong>
                                            {`Layer ${zOrder}`}
                                        </Text>
                                    </div>
                                )}
                                <ObjectItemContainer
                                    objectStates={objectStates}
                                    clientID={id}
                                    visibleSkeletonElements={visibleSkeletonElements}
                                    allowSimplifyLifecycle
                                    selectionEnabled
                                    selected={selectedStateIDs.includes(id)}
                                    onSelectionChange={changeStateSelection}
                                />
                            </React.Fragment>
                        );
                    },
                )}
            </div>
            {!!selectedObjectStates.length && (
                <SetParentModal
                    objectState={selectedObjectStates[0]}
                    objectStates={selectedObjectStates}
                    visible={setParentModalVisible}
                    onClose={() => setSetParentModalVisible(false)}
                    states={objectStates}
                    updateObjectStates={updateObjectStates}
                    jobInstance={null}
                />
            )}
        </>
    );
}

export default React.memo(ObjectListComponent);
