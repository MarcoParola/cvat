// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon, {
    CaretDownOutlined,
    CaretUpFilled,
    CloseOutlined,
    EyeInvisibleFilled,
    EyeOutlined,
    LinkOutlined,
    LockFilled,
    UnlockOutlined,
} from '@ant-design/icons';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Checkbox from 'antd/lib/checkbox';

import StatesOrderingSelector from 'components/annotation-page/standard-workspace/objects-side-bar/states-ordering-selector';
import CVATTooltip from 'components/common/cvat-tooltip';
import { StatesOrdering, Workspace } from 'reducers';
import { ShowGroundTruthIcon } from 'icons';

interface Props {
    workspace: Workspace;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsed: boolean;
    statesOrdering: StatesOrdering;
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    showGroundTruth: boolean;
    count: number;
    selectableCount: number;
    selectedCount: number;
    allStatesSelected: boolean;
    changeStatesOrdering(value: StatesOrdering): void;
    selectAllStates(): void;
    clearSelectedStates(): void;
    setParentForSelectedStates(): void;
    lockAllStates(): void;
    unlockAllStates(): void;
    collapseAllStates(): void;
    expandAllStates(): void;
    hideAllStates(): void;
    showAllStates(): void;
    changeShowGroundTruth(): void;
}

function SelectAllSwitcher(props: Props): JSX.Element {
    const {
        selectableCount, selectedCount, allStatesSelected, selectAllStates, clearSelectedStates,
    } = props;
    return (
        <Col span={3}>
            <CVATTooltip title={allStatesSelected ? 'Clear selected objects' : 'Select all objects'}>
                <Checkbox
                    disabled={!selectableCount}
                    checked={allStatesSelected}
                    indeterminate={selectedCount > 0 && !allStatesSelected}
                    onChange={() => {
                        if (allStatesSelected) {
                            clearSelectedStates();
                        } else {
                            selectAllStates();
                        }
                    }}
                    className='cvat-objects-sidebar-select-all'
                />
            </CVATTooltip>
        </Col>
    );
}

function SetParentForSelectedSwitcher(props: Props): JSX.Element {
    const { selectedCount, setParentForSelectedStates } = props;
    const tooltipTitle = selectedCount ?
        `Set parent for ${selectedCount} selected objects` :
        'Select objects to set parent';

    return (
        <Col span={3}>
            <CVATTooltip title={tooltipTitle}>
                <LinkOutlined
                    className={selectedCount ? 'cvat-objects-sidebar-bulk-parent-active' : ''}
                    onClick={selectedCount ? setParentForSelectedStates : undefined}
                />
            </CVATTooltip>
        </Col>
    );
}

function ClearSelectionSwitcher(props: Props): JSX.Element {
    const { selectedCount, clearSelectedStates } = props;
    return (
        <Col span={3}>
            <CVATTooltip title='Clear selected objects'>
                <CloseOutlined onClick={selectedCount ? clearSelectedStates : undefined} />
            </CVATTooltip>
        </Col>
    );
}

function LockAllSwitcher(props: Props): JSX.Element {
    const {
        statesLocked, switchLockAllShortcut, unlockAllStates, lockAllStates,
    } = props;
    return (
        <Col span={3}>
            <CVATTooltip title={`Switch lock property for all ${switchLockAllShortcut}`}>
                {statesLocked ? <LockFilled onClick={unlockAllStates} /> : <UnlockOutlined onClick={lockAllStates} />}
            </CVATTooltip>
        </Col>
    );
}

function HideAllSwitcher(props: Props): JSX.Element {
    const {
        statesHidden, switchHiddenAllShortcut, showAllStates, hideAllStates,
    } = props;
    return (
        <Col span={3}>
            <CVATTooltip title={`Switch hidden property for all ${switchHiddenAllShortcut}`}>
                {statesHidden ? (
                    <EyeInvisibleFilled onClick={showAllStates} />
                ) : (
                    <EyeOutlined onClick={hideAllStates} />
                )}
            </CVATTooltip>
        </Col>
    );
}

function GTSwitcher(props: Props): JSX.Element {
    const {
        showGroundTruth, changeShowGroundTruth,
    } = props;
    return (
        <Col span={3}>
            <CVATTooltip title='Show Ground truth annotations and conflicts'>
                <Icon
                    className={
                        `cvat-objects-sidebar-show-ground-truth ${showGroundTruth ? 'cvat-objects-sidebar-show-ground-truth-active' : ''}`
                    }
                    component={ShowGroundTruthIcon}
                    onClick={changeShowGroundTruth}
                />
            </CVATTooltip>
        </Col>
    );
}

function CollapseAllSwitcher(props: Props): JSX.Element {
    const { statesCollapsed, expandAllStates, collapseAllStates } = props;
    return (
        <Col span={3}>
            <CVATTooltip title='Expand/collapse all'>
                {statesCollapsed ? (
                    <CaretDownOutlined onClick={expandAllStates} />
                ) : (
                    <CaretUpFilled onClick={collapseAllStates} />
                )}
            </CVATTooltip>
        </Col>
    );
}

function ObjectListHeader(props: Props): JSX.Element {
    const {
        workspace, statesOrdering, count, changeStatesOrdering,
    } = props;

    return (
        <div className='cvat-objects-sidebar-states-header'>
            <Row justify='space-between' align='middle'>
                <Col span={24}>
                    <Text>{`Items: ${count}`}</Text>
                    <StatesOrderingSelector
                        statesOrdering={statesOrdering}
                        changeStatesOrdering={changeStatesOrdering}
                    />
                </Col>
                <Col span={24}>
                    <Row justify='space-around' align='middle'>
                        <SelectAllSwitcher {...props} />
                        <SetParentForSelectedSwitcher {...props} />
                        <ClearSelectionSwitcher {...props} />
                        <LockAllSwitcher {...props} />
                        <HideAllSwitcher {...props} />
                        { workspace === Workspace.REVIEW && (
                            <GTSwitcher {...props} />
                        )}
                        <CollapseAllSwitcher {...props} />
                    </Row>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ObjectListHeader);
