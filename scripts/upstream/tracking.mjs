// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createHash } from 'node:crypto';
import semver from 'semver';
import { assertSourceEligible } from './config.mjs';
import { request } from './http.mjs';

export const trackingBranch = 'automation/upstream-state';
export const trackingPath = 'upstream/detection.json';
export const stateHash = (state) =>
  createHash('sha256').update(JSON.stringify(state)).digest('hex');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function keys(value, names) {
  return (
    record(value) &&
    Object.keys(value).length === names.length &&
    names.every((key) => Object.hasOwn(value, key))
  );
}

/** Detection cursors are deliberately separate from main's reviewed contracts. */
export function validateTracking(value, main) {
  if (
    !keys(value, ['schemaVersion', 'lastSuccessfulCheck', 'packages']) ||
    value.schemaVersion !== 1 ||
    (value.lastSuccessfulCheck !== null &&
      (typeof value.lastSuccessfulCheck !== 'string' ||
        !Number.isFinite(Date.parse(value.lastSuccessfulCheck)))) ||
    !record(value.packages)
  )
    throw new Error('Invalid upstream detection telemetry');
  for (const [name, item] of Object.entries(value.packages)) {
    assertSourceEligible(name);
    if (
      !Object.hasOwn(main.packages, name) ||
      !keys(item, ['latestDetected', 'observedVersions']) ||
      typeof item.latestDetected !== 'string' ||
      !semver.valid(item.latestDetected) ||
      !Array.isArray(item.observedVersions) ||
      item.observedVersions.some((version) => typeof version !== 'string' || !semver.valid(version))
    )
      throw new Error('Invalid upstream detection telemetry package');
  }
  return value;
}

export function trackingFromState(state) {
  return validateTracking(
    {
      schemaVersion: 1,
      lastSuccessfulCheck: state.lastSuccessfulCheck ?? null,
      packages: Object.fromEntries(
        Object.entries(state.packages).map(([name, item]) => [
          name,
          {
            latestDetected: item.latestDetected ?? item.baseline.version,
            observedVersions: [...new Set(item.observedVersions ?? [])],
          },
        ]),
      ),
    },
    state,
  );
}

/** Always take baselines, candidates and verified/released support from main. */
export function withTracking(main, telemetry) {
  const state = structuredClone(main);
  if (telemetry === null) return state;
  validateTracking(telemetry, main);
  for (const [name, item] of Object.entries(telemetry.packages)) {
    state.packages[name].latestDetected = item.latestDetected;
    state.packages[name].observedVersions = [
      ...new Set([...(main.packages[name].observedVersions ?? []), ...item.observedVersions]),
    ];
  }
  state.lastSuccessfulCheck = telemetry.lastSuccessfulCheck;
  return state;
}

/** Reject an artifact that attempts to alter anything outside detection cursors. */
export function reviewedStateHash(state) {
  const reviewed = structuredClone(state);
  delete reviewed.lastSuccessfulCheck;
  for (const item of Object.values(reviewed.packages)) {
    delete item.latestDetected;
    delete item.observedVersions;
  }
  return stateHash(reviewed);
}

export async function readTracking({ repository, token }) {
  try {
    const file = await request(
      `https://api.github.com/repos/${repository}/contents/${trackingPath}?ref=${encodeURIComponent(trackingBranch)}`,
      { token },
    );
    if (typeof file.sha !== 'string' || !file.sha || typeof file.content !== 'string')
      throw new Error('Invalid upstream detection telemetry file');
    return { sha: file.sha, content: Buffer.from(file.content, 'base64').toString() };
  } catch (error) {
    if (error.status === 404) return { sha: null, content: null };
    throw error;
  }
}
