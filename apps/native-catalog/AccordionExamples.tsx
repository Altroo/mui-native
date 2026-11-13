// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  Button,
  Box,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';

/** Body-local state makes reopening a real retention check rather than screen-owned persistence. */
function DeliveryNote({ onEdit }: { onEdit: () => void }) {
  const [note, setNote] = useState('Leave with reception');
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Add a short note for the courier. It stays here when this section closes.
      </Typography>
      <TextField
        testID="accordion-note"
        label="Delivery note"
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          onEdit();
        }}
        fullWidth
      />
      <Typography testID="accordion-note-value" variant="caption" color="text.secondary">
        {note}
      </Typography>
    </Stack>
  );
}

function HelpReceipt() {
  const [read, setRead] = useState(false);
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        The receipt is prepared after delivery is completed. This independent panel removes its body
        when closed.
      </Typography>
      <Button testID="accordion-help-read" size="small" onClick={() => setRead(true)}>
        {read ? 'Read' : 'Mark as read'}
      </Button>
    </Stack>
  );
}

/** Independent and controlled panels exercise the public family rather than catalog-only rows. */
export function AccordionExamples() {
  const theme = useTheme();
  const [active, setActive] = useState<string | false>('delivery');
  const [saved, setSaved] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [changes, setChanges] = useState(0);
  const [phases, setPhases] = useState({ delivery: 'open', payment: 'closed' });
  const phase = (panel: 'delivery' | 'payment', value: string) =>
    setPhases((old) => ({ ...old, [panel]: value }));
  const indicator = (
    <Typography accessible={false} style={{ fontSize: 24, lineHeight: 24 }}>
      ⌄
    </Typography>
  );
  const panel = { borderColor: theme.palette.divider, borderWidth: 1, shadowOpacity: 0 };
  return (
    <ScrollView
      testID="accordion-scroll"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Stack spacing={3}>
        <View style={{ gap: 5 }}>
          <Typography variant="overline" color="text.secondary">
            Material · Accordion
          </Typography>
          <Typography variant="h5">Details, when you need them</Typography>
          <Typography variant="body2" color="text.secondary">
            A delivery review built from the library’s summary, details and actions. Open another
            section without losing your note.
          </Typography>
        </View>
        <Button
          testID="accordion-direction"
          size="small"
          variant="outlined"
          style={{ alignSelf: 'flex-start' }}
          accessibilityLabel={`Layout direction: ${rtl ? 'right to left' : 'left to right'}`}
          onClick={() => setRtl((value) => !value)}
        >
          {rtl ? 'Right to left' : 'Left to right'}
        </Button>
        <Box sx={{ direction: rtl ? 'rtl' : 'ltr' }} style={{ gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            ORDER NV-0482 · REVIEW
          </Typography>
          <Accordion
            elevation={0}
            testID="accordion-delivery"
            slotProps={{
              transition: {
                onEnter: () => phase('delivery', 'opening'),
                onEntered: () => phase('delivery', 'open'),
                onExit: () => phase('delivery', 'closing'),
                onExited: () => phase('delivery', 'closed'),
                slotProps: {
                  root: { testID: 'accordion-delivery-transition' },
                  wrapper: { testID: 'accordion-delivery-wrapper' },
                },
              },
            }}
            disableGutters
            expanded={active === 'delivery'}
            onChange={(_, open) => {
              setActive(open ? 'delivery' : false);
              setChanges((old) => old + 1);
            }}
            style={panel}
          >
            <AccordionSummary
              testID="accordion-delivery-summary"
              slotProps={{
                content: { testID: 'accordion-delivery-content' },
                expandIconWrapper: { testID: 'accordion-delivery-icon' },
              }}
              id="delivery-summary"
              aria-controls="delivery-region"
              expandIcon={indicator}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Typography variant="subtitle1">Delivery instructions</Typography>
                <Typography variant="caption" color="text.secondary">
                  Rabat · 2 parcels
                </Typography>
              </View>
            </AccordionSummary>
            <AccordionDetails>
              <DeliveryNote onEdit={() => setSaved(false)} />
            </AccordionDetails>
            <AccordionActions>
              <Button
                testID="accordion-save"
                size="small"
                onClick={() => setSaved(true)}
                variant="contained"
              >
                Save note
              </Button>
            </AccordionActions>
          </Accordion>
          <Accordion
            elevation={0}
            testID="accordion-payment"
            slotProps={{
              transition: {
                onEnter: () => phase('payment', 'opening'),
                onEntered: () => phase('payment', 'open'),
                onExit: () => phase('payment', 'closing'),
                onExited: () => phase('payment', 'closed'),
                slotProps: {
                  root: { testID: 'accordion-payment-transition' },
                  wrapper: { testID: 'accordion-payment-wrapper' },
                },
              },
            }}
            disableGutters
            expanded={active === 'payment'}
            onChange={(_, open) => {
              setActive(open ? 'payment' : false);
              setChanges((old) => old + 1);
            }}
            style={panel}
          >
            <AccordionSummary
              testID="accordion-payment-summary"
              id="payment-summary"
              aria-controls="payment-region"
              expandIcon={indicator}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Typography variant="subtitle1">Payment & receipt</Typography>
                <Typography variant="caption" color="text.secondary">
                  Card ending 0482
                </Typography>
              </View>
            </AccordionSummary>
            <AccordionDetails>
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Typography
                    testID="accordion-subtotal-label"
                    variant="body2"
                    color="text.secondary"
                  >
                    Subtotal
                  </Typography>
                  <Typography testID="accordion-subtotal-value" variant="body2">
                    640.00 MAD
                  </Typography>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Typography
                    testID="accordion-delivery-label"
                    variant="body2"
                    color="text.secondary"
                  >
                    Delivery
                  </Typography>
                  <Typography testID="accordion-delivery-value" variant="body2">
                    30.00 MAD
                  </Typography>
                </View>
                <View style={{ height: 1, backgroundColor: theme.palette.divider }} />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Typography testID="accordion-total-label" variant="subtitle2">
                    Total
                  </Typography>
                  <Typography testID="accordion-total-value" variant="subtitle2">
                    670.00 MAD
                  </Typography>
                </View>
              </View>
            </AccordionDetails>
          </Accordion>
          <Accordion
            elevation={0}
            testID="accordion-disabled"
            disabled
            disableGutters
            style={panel}
          >
            <AccordionSummary testID="accordion-disabled-summary" expandIcon={indicator}>
              <View style={{ flex: 1, gap: 3 }}>
                <Typography variant="subtitle1">Return request</Typography>
                <Typography variant="caption" color="text.secondary">
                  Available after delivery
                </Typography>
              </View>
            </AccordionSummary>
            <AccordionDetails>
              Return instructions become available after delivery.
            </AccordionDetails>
          </Accordion>
        </Box>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Typography
            testID="accordion-status"
            variant="caption"
            color={saved ? 'success.main' : 'text.secondary'}
          >
            {saved ? 'Note saved' : 'Draft retained'}
          </Typography>
          <Typography
            testID="accordion-changes"
            variant="caption"
            color="text.secondary"
          >{`Section changes: ${changes}`}</Typography>
        </View>
        <Typography
          testID="accordion-phases"
          variant="caption"
          color="text.secondary"
        >{`Delivery: ${phases.delivery} · Payment: ${phases.payment}`}</Typography>
        <View style={{ gap: 8 }}>
          <Typography variant="overline" color="text.secondary">
            INDEPENDENT PANEL
          </Typography>
          <Accordion
            elevation={0}
            testID="accordion-help"
            style={panel}
            slotProps={{
              transition: {
                unmountOnExit: true,
                slotProps: { root: { testID: 'accordion-help-transition' } },
              },
            }}
          >
            <AccordionSummary
              testID="accordion-help-summary"
              id="help-summary"
              aria-controls="help-region"
              expandIcon={indicator}
            >
              How does the receipt work?
            </AccordionSummary>
            <AccordionDetails testID="accordion-help-details">
              <HelpReceipt />
            </AccordionDetails>
          </Accordion>
        </View>
      </Stack>
    </ScrollView>
  );
}
