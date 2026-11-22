#pragma once
#include <istream>
#include <string>
#include <ostream>
#include "PartIdentifiers.h"

namespace towerflow {

// A cancelled read returns false just like EOF, but leaves the stream open.
inline bool optionCancelled = false;

inline bool ReadOptionLine(std::istream& input, std::string& line) {
    if (!std::getline(input, line)) return false;
    const auto first = line.find_first_not_of(" \t\r\n\f\v");
    if (first != std::string::npos) {
        const auto last = line.find_last_not_of(" \t\r\n\f\v");
        if (line.compare(first, last - first + 1, "/back") == 0) {
            optionCancelled = true;
            return false;
        }
    }
    return true;
}

inline bool ReadIdentifier(std::istream& input, std::ostream& output, const char* prompt,
                           std::string& value, bool (*isValid)(const std::string&),
                           const char* error) {
    std::string line;
    while (true) {
        output << prompt;
        if (!ReadOptionLine(input, line)) return false;

        const auto first = line.find_first_not_of(" \t\r\n\f\v");
        if (first != std::string::npos) {
            const auto last = line.find_last_not_of(" \t\r\n\f\v");
            line = line.substr(first, last - first + 1);
        } else {
            line.clear();
        }

        if (isValid(line)) {
            value = line;
            return true;
        }
        output << error << '\n';
    }
}

inline bool ReadPartId(std::istream& input, std::ostream& output, const char* prompt,
                       std::string& value) {
    return ReadIdentifier(input, output, prompt, value, IsPartId,
                          "Use letters and digits only for the Part ID.");
}

inline bool ReadSerialNumber(std::istream& input, std::ostream& output, const char* prompt,
                             std::string& value) {
    return ReadIdentifier(input, output, prompt, value, IsSerialNumber,
                          "Enter a Serial Number with 1 to 20 digits.");
}

inline bool TakeOptionCancellation() {
    const bool cancelled = optionCancelled;
    optionCancelled = false;
    return cancelled;
}

} // namespace towerflow
