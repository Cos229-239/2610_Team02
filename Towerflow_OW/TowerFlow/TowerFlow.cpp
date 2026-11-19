#ifdef _WIN32
#include "WindowsGui.h"
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <shellapi.h>
#else
#include "UserInterface.h"
#endif
#include <exception>
#ifndef _WIN32
#include <iostream>
#endif

#ifdef _WIN32
int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
    SetProcessDPIAware();
    int count = 0;
    LPWSTR* args = CommandLineToArgvW(GetCommandLineW(), &count);
    if (!args) return 1;
    const std::filesystem::path filename = count > 1 ? args[1] : L"inventory.txt";
    LocalFree(args);
    try {
        return runWindowsGui(filename);
    }
    catch (const std::exception& error) {
        MessageBoxA(nullptr, error.what(), "TowerFlow error", MB_OK | MB_ICONERROR);
        return 1;
    }
}
#else
int main(int argc, char* argv[]) {
    try {
        const std::string filename =
            argc > 1 ? argv[1] : "inventory.txt";

        UserInterface app(filename);
        return app.run();

    }
    catch (const std::exception& error) {
        std::cerr << "Unexpected error: "
            << error.what() << '\n';

        return 1;
    }
}
#endif
