// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#include <array>
#include <cstdint>
#include <limits>
#include <stdexcept>
#include <string>
#include <type_traits>
namespace altroo::style_runtime {
inline constexpr std::size_t ownerLimit = 96, detailLimit = 192;
struct Status {
  bool active = false, hookRegistered = false, degraded = false;
  std::uint64_t generation = 0, attempts = 0, returnedCandidates = 0,
                changedCandidates = 0, cancelledCandidates = 0, errors = 0;
  std::array<char, ownerLimit + 1> owner{};
  std::array<char, detailLimit + 1> detail{};
  // 0 none, 1 resolver error. These are selection returns, not accepted/mounted
  // proof.
  unsigned errorCode = 0;
  std::array<std::size_t, 6> lastCounts{};
};
static_assert(std::is_nothrow_copy_assignable_v<Status>);
inline void increment(std::uint64_t &value) noexcept {
  if (value != std::numeric_limits<std::uint64_t>::max())
    ++value;
}
inline std::uint64_t generation(const std::string &value) {
  if (value.empty() || value.size() > 20 ||
      (value.size() > 1 && value[0] == '0'))
    throw std::invalid_argument("Invalid structural style generation");
  std::uint64_t result = 0;
  for (const auto ch : value) {
    if (ch < '0' || ch > '9' ||
        result > (std::numeric_limits<std::uint64_t>::max() - (ch - '0')) / 10)
      throw std::invalid_argument("Invalid structural style generation");
    result = result * 10 + static_cast<unsigned>(ch - '0');
  }
  return result;
}
inline std::array<char, ownerLimit + 1> owner(const std::string &value) {
  if (value.empty() || value.size() > ownerLimit)
    throw std::invalid_argument("Invalid structural style owner");
  std::array<char, ownerLimit + 1> result{};
  for (std::size_t i = 0; i < value.size(); ++i) {
    const auto c = value[i];
    if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
          (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' ||
          c == ':'))
      throw std::invalid_argument("Invalid structural style owner");
    result[i] = c;
  }
  return result;
}
inline void error(Status &state, const char *message) noexcept {
  increment(state.errors);
  state.degraded = true;
  state.errorCode = 1;
  state.detail.fill(0);
  if (!message)
    return;
  for (std::size_t i = 0; i < detailLimit && message[i]; ++i) {
    const auto c = static_cast<unsigned char>(message[i]);
    state.detail[i] = c >= 32 && c < 127 ? static_cast<char>(c) : '?';
  }
}
} // namespace altroo::style_runtime
