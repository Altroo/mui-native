# Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
cmake_minimum_required(VERSION 3.13)
set(PORTAL_CPP "${CMAKE_CURRENT_SOURCE_DIR}/../common/cpp")
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/build/generated/source/codegen/jni" "${CMAKE_CURRENT_BINARY_DIR}/generated")
target_sources(react_codegen_AltrooMuiNativeHostSpec PRIVATE "${PORTAL_CPP}/AltrooPortalShadowNodes.cpp" "${PORTAL_CPP}/AltrooStructuralObserver.cpp" "${PORTAL_CPP}/AltrooPrelayoutProbe.cpp")
target_include_directories(react_codegen_AltrooMuiNativeHostSpec BEFORE PUBLIC "${PORTAL_CPP}")
