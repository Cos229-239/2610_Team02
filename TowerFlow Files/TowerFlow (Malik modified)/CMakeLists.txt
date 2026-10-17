cmake_minimum_required(VERSION 3.16)
project(TowerFlow LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
# Legacy files are included by main. Do not compile individually.
add_executable(TowerFlow "TowerFlow (Malik version).cpp")
add_executable(PartTests tests/CurrentPartTests.cpp)
enable_testing()
add_test(NAME PartTests COMMAND PartTests)
