#include <iostream>
#include <string>
#include <vector>

// Defines a Part including: ID, name, and quantity.
struct Part
{
    std::string id;
    std::string name;
    int quantity = 0;
};

// Option 1: Calculates the combined quantity of all parts.
long long getTotalStock(const std::vector<Part>& inventory)
{
    long long total = 0;

    for (const Part& part : inventory)
    {
        total += part.quantity;
    }

    return total;
}


// Option 2: Add a part if its data is valid and its ID is unique.
bool createPart(
    std::vector<Part>& inventory,
    const std::string& id,
    const std::string& name,
    int quantity)
{
    // Rejects empty text and text containing only whitespace.
    if (id.find_first_not_of(" \t\r\n") == std::string::npos ||
        name.find_first_not_of(" \t\r\n") == std::string::npos ||
        quantity < 0)
    {
        return false;
    }

    for (const Part& part : inventory)
    {
        if (part.id == id)
        {
            return false; // If the ID already exists
        }
    }

    inventory.push_back(Part{id, name, quantity});
    return true;
}


// Option 3: Display each part in the inventory.
void listParts(const std::vector<Part>& inventory)
{
    if (inventory.empty())
    {
        std::cout << "No parts in inventory.\n";
        return;
    }

    for (const Part& part : inventory)
    {
        std::cout << "ID: " << part.id
                  << " | Name: " << part.name
                  << " | Quantity: " << part.quantity
                  << '\n';
    }
}


// Option 4: Update an existing part's name and quantity.
bool editPart(
    std::vector<Part>& inventory,
    const std::string& id,
    const std::string& newName,
    int newQuantity)
{
    if (newName.find_first_not_of(" \t\r\n") == std::string::npos ||
        newQuantity < 0)
    {
        return false;
    }

    for (Part& part : inventory)
    {
        if (part.id == id)
        {
            part.name = newName;
            part.quantity = newQuantity;
            return true;
        }
    }

    return false; // No part has the requested ID.
}