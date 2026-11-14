#include "UserInterface.h"
#include <exception>
#include <iostream>

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
