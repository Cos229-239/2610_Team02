#pragma once
#include "OptionInput.h"
#include "Part (Malik version).cpp"
#include <vector>

namespace towerflow {

inline bool ReadExistingPartId(std::istream& input, std::ostream& output,
                               const std::vector<Part>& parts, const char* prompt,
                               std::string& partId) {
    if (parts.empty()) {
        output << "No existing parts. Create a part with option 2 first.\n";
        return false;
    }

    output << "\nAvailable Part IDs:\n";
    bool first = true;
    for (const auto& part : parts) {
        if (!first) output << "----------------------------------------\n";
        output << part.PartId << " | " << part.Name << '\n';
        first = false;
    }
    output << '\n';
    return ReadPartId(input, output, prompt, partId);
}

} // namespace towerflow
