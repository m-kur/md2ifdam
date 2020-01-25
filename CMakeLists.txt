cmake_minimum_required(VERSION 3.10)

project(fontFinder)

if(APPLE)
    file(GLOB SOURCE_FILES "src/*Mac.cc" "src/*Mac.h")
    find_library(CORETEXT CoreText)
    find_library(FOUNDATION Foundation)
    set(CMAKE_JS_LIB ${CMAKE_JS_LIB} ${CORETEXT} ${FOUNDATION})
endif(APPLE)

add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_JS_INC})
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})
