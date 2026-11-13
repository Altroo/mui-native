// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Component default mapping adapts MIT Material UI 9.5.0 styles/props.d.ts; see NOTICE.
import type { ComponentProps } from 'react';
import type { AutocompleteProps } from '../autocompleteTypes';
import type { ButtonProps, IconButtonProps } from '../buttonTypes';
import type { ButtonGroupProps } from '../buttonGroupTypes';
import type { ChipProps } from '../chipTypes';
import type { SvgIconProps } from '../svgIconTypes';
import type { SelectProps } from '../select';
import type { TextFieldProps } from '../forms';
import type { PopperProps } from '../popper';
import type { DividerProps } from '../dividerTypes';
import type { PaperProps } from '../paperTypes';
import type { CardProps } from '../cardTypes';
import type { CardActionsProps } from '../cardActions';
import type { DialogActionsProps } from '../dialogActions';
import type { DialogTitleProps } from '../dialogTitle';
import type { CircularProgressProps } from '../circularProgressTypes';

type MaterialExports = typeof import('../index');
// Only existing native exports from the pinned ComponentsPropsList participate.
type ComponentName =
  | 'Alert'
  | 'Autocomplete'
  | 'Backdrop'
  | 'Button'
  | 'ButtonBase'
  | 'ButtonGroup'
  | 'Card'
  | 'CardActions'
  | 'CardContent'
  | 'Checkbox'
  | 'Chip'
  | 'CircularProgress'
  | 'Collapse'
  | 'Dialog'
  | 'DialogActions'
  | 'DialogContent'
  | 'DialogTitle'
  | 'Divider'
  | 'Accordion'
  | 'AccordionActions'
  | 'AccordionDetails'
  | 'AccordionSummary'
  | 'FilledInput'
  | 'FormControl'
  | 'FormControlLabel'
  | 'FormGroup'
  | 'FormHelperText'
  | 'FormLabel'
  | 'IconButton'
  | 'Input'
  | 'InputAdornment'
  | 'InputBase'
  | 'InputLabel'
  | 'LinearProgress'
  | 'List'
  | 'ListItem'
  | 'ListItemButton'
  | 'ListItemAvatar'
  | 'ListItemIcon'
  | 'ListItemSecondaryAction'
  | 'ListItemText'
  | 'ListSubheader'
  | 'Menu'
  | 'MenuItem'
  | 'MenuList'
  | 'Modal'
  | 'NativeSelect'
  | 'OutlinedInput'
  | 'Paper'
  | 'Popper'
  | 'Popover'
  | 'Radio'
  | 'RadioGroup'
  | 'Select'
  | 'Snackbar'
  | 'Stack'
  | 'SvgIcon'
  | 'Switch'
  | 'TextField'
  | 'Typography';
type ExistingComponentProps = {
  [Name in ComponentName as `Mui${Name}`]: ComponentProps<MaterialExports[Name]>;
};
// Generic callable extraction uses the last overload and infers unknown. Match
// the pinned declaration's explicit any parameters or public Props defaults.
interface GenericComponentProps {
  MuiAutocomplete: AutocompleteProps<any, any, any, any, any, any>;
  MuiButton: ButtonProps;
  MuiIconButton: IconButtonProps;
  MuiButtonGroup: ButtonGroupProps;
  MuiChip: ChipProps;
  MuiSvgIcon: SvgIconProps;
  MuiSelect: SelectProps;
  MuiTextField: TextFieldProps;
  MuiPopper: PopperProps;
  MuiDivider: DividerProps;
  MuiPaper: PaperProps;
  MuiCard: CardProps;
  MuiCardActions: CardActionsProps;
  MuiDialogActions: DialogActionsProps;
  MuiDialogTitle: DialogTitleProps;
  MuiCircularProgress: CircularProgressProps;
}
export interface ComponentsPropsList
  extends Omit<ExistingComponentProps, keyof GenericComponentProps>,
    GenericComponentProps {}
export type ComponentsProps = {
  [Name in keyof ComponentsPropsList]?: Partial<ComponentsPropsList[Name]>;
};
