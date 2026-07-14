// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import Text from 'antd/lib/typography/Text';
import Collapse from 'antd/lib/collapse';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';

import ObjectButtonsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-buttons';
import ItemDetailsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { ColorBy } from 'reducers';
import { ObjectType, ShapeType } from 'cvat-core-wrapper';
import ObjectItemElementComponent from './object-item-element';
import ItemBasics from './object-item-basics';
import SetParentModal from './set-parent-modal';

interface Props {
    normalizedKeyMap: Record<string, string>;
    activated: boolean;
    objectType: ObjectType;
    shapeType: ShapeType;
    clientID: number;
    serverID: number | null;
    labelID: number;
    isGroundTruth: boolean;
    locked: boolean;
    elements: number[];
    color: string;
    colorBy: ColorBy;
    labels: any[];
    attributes: any[];
    jobInstance: any;
    objectState: any;
    states: any[];
    parentID: number | null;
    hierarchyLevel: number;
    selected?: boolean;
    selectionEnabled?: boolean;
    activate(activeElementID?: number): void;
    focusAndExpand(): void;
    onSelectionChange?(clientID: number, selected: boolean): void;
    copy(): void;
    propagate(): void;
    switchOrientation(): void;
    createURL(): void;
    toBackground(): void;
    toForeground(): void;
    toOneLayerBackward(): void;
    toOneLayerForward(): void;
    remove(): void;
    changeLabel(label: any): void;
    changeColor(color: string): void;
    resetCuboidPerspective(): void;
    runAnnotationAction(): void;
    edit(): void;
    slice(): void;
    simplify(): void;
    updateState(objectState: any): void;
}

function ObjectItemComponent(props: Props): JSX.Element {
    const {
        activated,
        objectType,
        shapeType,
        clientID,
        serverID,
        locked,
        labelID,
        color,
        colorBy,
        elements,
        labels,
        normalizedKeyMap,
        isGroundTruth,
        activate,
        focusAndExpand,
        copy,
        propagate,
        createURL,
        switchOrientation,
        toBackground,
        toForeground,
        toOneLayerForward,
        toOneLayerBackward,
        remove,
        changeLabel,
        changeColor,
        resetCuboidPerspective,
        runAnnotationAction,
        edit,
        slice,
        simplify,
        jobInstance,
        objectState,
        states,
        hierarchyLevel = 0,
        selected = false,
        selectionEnabled = false,
        onSelectionChange,
        updateState,
    } = props;

    const [setParentModalVisible, setSetParentModalVisible] = useState(false);

    const type =
        objectType === ObjectType.TAG ?
            ObjectType.TAG.toUpperCase() :
            `${shapeType.toUpperCase()} ${objectType.toUpperCase()}`;

    const className = !activated ?
        'cvat-objects-sidebar-state-item' :
        'cvat-objects-sidebar-state-item cvat-objects-sidebar-state-active-item';

    const activateState = useCallback(() => {
        activate();
    }, []);

    const handleSetParent = useCallback(() => {
        setSetParentModalVisible(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSetParentModalVisible(false);
    }, []);

    const handleSelectionChange = useCallback((event: CheckboxChangeEvent) => {
        onSelectionChange?.(clientID, event.target.checked);
    }, [clientID, onSelectionChange]);

    // Calculate left padding for hierarchical indentation (16px per level)
    const indentationStyle = {
        paddingLeft: `${hierarchyLevel * 16}px`,
    };

    return (
        <>
            <div
                className='cvat-objects-sidebar-state-item-wrapper'
                style={{ ...indentationStyle }}
            >
                {selectionEnabled && (
                    <Checkbox
                        checked={selected}
                        disabled={isGroundTruth}
                        onChange={handleSelectionChange}
                        className='cvat-objects-sidebar-state-item-selector'
                    />
                )}
                <div
                    onMouseEnter={activateState}
                    onDoubleClick={focusAndExpand}
                    id={`cvat-objects-sidebar-state-item-${clientID}`}
                    className={className}
                    style={{ '--state-item-background': `${color}` } as React.CSSProperties}
                >
                    <ItemBasics
                        jobInstance={jobInstance}
                        serverID={serverID}
                        clientID={clientID}
                        labelID={labelID}
                        labels={labels}
                        shapeType={shapeType}
                        objectType={objectType}
                        color={color}
                        colorBy={colorBy}
                        type={type}
                        locked={locked}
                        isGroundTruth={isGroundTruth}
                        copyShortcut={normalizedKeyMap.COPY_SHAPE}
                        pasteShortcut={normalizedKeyMap.PASTE_SHAPE}
                        propagateShortcut={normalizedKeyMap.PROPAGATE_OBJECT}
                        toBackgroundShortcut={normalizedKeyMap.TO_BACKGROUND}
                        toForegroundShortcut={normalizedKeyMap.TO_FOREGROUND}
                        toOneLayerBackwardShortcut={normalizedKeyMap.TO_ONE_LAYER_BACKWARD}
                        toOneLayerForwardShortcut={normalizedKeyMap.TO_ONE_LAYER_FORWARD}
                        removeShortcut={normalizedKeyMap.DELETE_OBJECT_STANDARD_WORKSPACE}
                        changeColorShortcut={normalizedKeyMap.CHANGE_OBJECT_COLOR}
                        sliceShortcut={normalizedKeyMap.SWITCH_SLICE_MODE}
                        runAnnotationsActionShortcut={normalizedKeyMap.RUN_ANNOTATIONS_ACTION}
                        changeLabel={changeLabel}
                        changeColor={changeColor}
                        copy={copy}
                        remove={remove}
                        propagate={propagate}
                        createURL={createURL}
                        switchOrientation={switchOrientation}
                        toBackground={toBackground}
                        toForeground={toForeground}
                        toOneLayerBackward={toOneLayerBackward}
                        toOneLayerForward={toOneLayerForward}
                        resetCuboidPerspective={resetCuboidPerspective}
                        edit={edit}
                        slice={slice}
                        simplify={simplify}
                        runAnnotationAction={runAnnotationAction}
                        setParent={handleSetParent}
                    />
                    <ObjectButtonsContainer clientID={clientID} />
                    <ItemDetailsContainer
                        readonly={locked}
                        clientID={clientID}
                        parentID={null}
                    />
                    {!!elements.length && (
                        <Collapse
                            className='cvat-objects-sidebar-state-item-elements-collapse'
                            items={[{
                                key: 'elements',
                                label: <Text style={{ fontSize: 10 }} type='secondary'>PARTS</Text>,
                                children: elements.map((element: number) => (
                                    <ObjectItemElementComponent
                                        key={element}
                                        parentID={clientID}
                                        clientID={element}
                                        onMouseLeave={activateState}
                                    />
                                )),
                            }]}
                        />
                    )}
                </div>
            </div>
            {objectState && states && (
                <SetParentModal
                    objectState={objectState}
                    visible={setParentModalVisible}
                    onClose={handleCloseModal}
                    states={states}
                    updateObjectState={updateState}
                    updateObjectStates={(updatedStates: any[]) => updatedStates.forEach(updateState)}
                    jobInstance={jobInstance}
                />
            )}
        </>
    );
}

export default React.memo(ObjectItemComponent);
