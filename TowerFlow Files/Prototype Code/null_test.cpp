#include <iostream>
#include <sstream>
#include <string>


int readMenuChoice()
{
    std::string input;

    while (true)
    {
        std::cout << "Selection: => ";

        if (!std::getline(std::cin, input))
        {
            return 16;
        }

        std::istringstream parser(input);
        int choice{};
        char extra{};

        if ((parser >> choice) && !(parser >> extra) && choice >= 1 && choice <= 16)
        {
            return choice;
        }

        std::cout << "Please enter a whole number between 1 and 16. \n";
    }
}