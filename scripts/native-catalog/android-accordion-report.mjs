// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export const accordionStages = [
  'scene-ready',
  'edited-local-note',
  'delivery-closed-payment-open',
  'retained-body-and-note',
  'actions-activated',
  'disabled-summary',
  'help-mounted',
  'help-read',
  'help-unmounted',
  'help-remounted-fresh',
  'help-final-close',
];
export const accordionPictures = ['initial.png', 'payment.png', 'retained.png'];
const sampleNames = ['delivery-initial', 'delivery-closed', 'payment-open', 'delivery-reopened'];
/** Native success requires the complete scenario and real endpoint measurements. */
/** Validate diagnostic locations even when native assertions failed, so evidence can be retained safely. */
export function inspectAccordionReport(output) {
  const matches = [...output.matchAll(/^INSTRUMENTATION_RESULT: accordionReport=([^\r\n]+)\r?$/gm)];
  if (matches.length !== 1) throw Error('No unambiguous Accordion instrumentation report');
  const report = JSON.parse(matches[0][1]);
  if (
    report?.schemaVersion !== 1 ||
    report.scenario !== 'accordion-v1' ||
    report.driver !== 'native Instrumentation and UiAutomation' ||
    typeof report.artifactDirectory !== 'string' ||
    !/^cache\/mui-accordion-\d+$/.test(report.artifactDirectory) ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device?.model !== 'string' ||
    !report.device.model ||
    !Array.isArray(report.screenshots) ||
    new Set(report.screenshots).size !== report.screenshots.length ||
    !report.screenshots.every((file) =>
      [...accordionPictures, 'help-input.png', 'failure.png'].includes(file),
    )
  )
    throw Error('Unsafe or incomplete Accordion diagnostic metadata');
  return report;
}
export function summarizeAccordion(output) {
  const matches = [...output.matchAll(/^INSTRUMENTATION_RESULT: accordionReport=([^\r\n]+)\r?$/gm)];
  if (
    matches.length !== 1 ||
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output)
  )
    throw Error('Missing or failed Accordion instrumentation');
  const report = inspectAccordionReport(output);
  if (
    report.schemaVersion !== 1 ||
    report.scenario !== 'accordion-v1' ||
    report.driver !== 'native Instrumentation and UiAutomation' ||
    report.status !== 'passed' ||
    report.error != null ||
    typeof report.artifactDirectory !== 'string' ||
    !/^cache\/mui-accordion-\d+$/.test(report.artifactDirectory) ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device?.model !== 'string' ||
    !report.device.model ||
    JSON.stringify(report.stages) !== JSON.stringify(accordionStages) ||
    JSON.stringify(report.screenshots) !==
      JSON.stringify(
        report.inputQualification ? [...accordionPictures, 'help-input.png'] : accordionPictures,
      ) ||
    !Array.isArray(report.samples) ||
    report.samples.length !== sampleNames.length
  )
    throw Error('Incomplete native Accordion evidence');
  for (const [index, sample] of report.samples.entries()) {
    if (
      sample?.name !== sampleNames[index] ||
      !Number.isInteger(sample.actual) ||
      !Number.isInteger(sample.natural) ||
      sample.actual < 0 ||
      sample.natural <= 0 ||
      (index === 1
        ? sample.actual !== 0
        : sample.actual <= 0 || Math.abs(sample.actual - sample.natural) > 2)
    )
      throw Error('Inconsistent native Accordion bounds at sample ' + index);
  }
  if (report.inputQualification !== undefined) {
    const targets = [
      'catalog-tab-Accordion',
      'accordion-note',
      'accordion-payment-summary',
      'accordion-delivery-summary',
      'accordion-save',
      'accordion-disabled-summary',
      'accordion-help-summary',
      'accordion-help-read',
      'accordion-help-summary',
      'accordion-help-summary',
      'accordion-help-summary',
    ];
    if (
      report.inputQualification !== 'unobstructed-logbox-v1' ||
      !Array.isArray(report.touches) ||
      report.touches.length !== targets.length ||
      report.touches.some(
        (touch, index) =>
          touch.target !== targets[index] ||
          !Number.isFinite(touch.x) ||
          !Number.isFinite(touch.y) ||
          typeof touch.imeVisible !== 'boolean' ||
          touch.diagnosticClear !== true ||
          touch.viewportClear !== true,
      )
    )
      throw Error('Unqualified native Accordion input');
  }
  return report;
}
