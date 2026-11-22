// Dulskinator96 — Azure Stock Guide for KuroKage / William's TowerFlow WinForms.
// Local, deterministic guidance: no external model, server, network, or collaboration-room dependency.
using System.Text.RegularExpressions;

namespace TowerFlowWinForm;

internal sealed record AzureStockChange(
    int PartNumber, int SerialNumber, string ExpectedName,
    int ExpectedRevision, int ExpectedQuantity, int NewQuantity);

internal sealed record AzureAdvice(
    string Message, IReadOnlyList<Part>? DisplayParts = null, AzureStockChange? ProposedChange = null);

internal static class AzureStockGuide
{
    private const int MaximumQuantity = 1_000_000;
    private static readonly Regex Adjustment = new(
        @"^(set|add)\s+(\d+)\s*/\s*(\d+)\s+(to|by)\s+(\d+)$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public static AzureAdvice Interpret(string? input, IReadOnlyList<Part> parts)
    {
        var request = (input ?? "").Trim();
        if (request.Length == 0 || request.Equals("help", StringComparison.OrdinalIgnoreCase))
            return new("Azure Guide — commands: low stock, find <name>, sort name, sort quantity, " +
                       "set <part#>/<serial#> to <quantity>, add <part#>/<serial#> by <quantity>. " +
                       "Changes are previewed and require confirmation.");

        if (request.Equals("low stock", StringComparison.OrdinalIgnoreCase))
        {
            var low = parts.Where(p => p.Quantity <= 5).OrderBy(p => p.Quantity)
                .ThenBy(p => p.Name, StringComparer.OrdinalIgnoreCase).ToList();
            return new(low.Count == 0 ? "No parts at or below 5 units." :
                $"{low.Count} part(s) at or below 5 units. Table filtered to low stock.", low);
        }

        if (request.StartsWith("find ", StringComparison.OrdinalIgnoreCase))
        {
            var term = request[5..].Trim();
            if (term.Length == 0) return new("Enter a name after find.");
            var matches = parts.Where(p => p.Name.Contains(term, StringComparison.OrdinalIgnoreCase))
                .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase).ToList();
            return new($"{matches.Count} part(s) match '{term}'.", matches);
        }

        if (request.Equals("sort quantity", StringComparison.OrdinalIgnoreCase))
            return new("Showing all parts, lowest quantity first.",
                parts.OrderBy(p => p.Quantity).ThenBy(p => p.Name, StringComparer.OrdinalIgnoreCase).ToList());

        if (request.Equals("sort name", StringComparison.OrdinalIgnoreCase))
            return new("Showing all parts alphabetically.",
                parts.OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase).ToList());

        var match = Adjustment.Match(request);
        if (!match.Success)
            return new("Command not recognized. Type help to see supported actions.");

        bool isSet = match.Groups[1].Value.Equals("set", StringComparison.OrdinalIgnoreCase);
        bool validPreposition = match.Groups[4].Value.Equals(isSet ? "to" : "by", StringComparison.OrdinalIgnoreCase);
        if (!validPreposition ||
            !int.TryParse(match.Groups[2].Value, out var partNumber) ||
            !int.TryParse(match.Groups[3].Value, out var serialNumber) ||
            !int.TryParse(match.Groups[5].Value, out var amount))
            return new("Use set <part#>/<serial#> to <quantity> or add <part#>/<serial#> by <quantity>.");

        var targets = parts.Where(p => p.PartNumber == partNumber && p.SerialNumber == serialNumber).ToList();
        if (targets.Count != 1)
            return new(targets.Count == 0 ? "Part not found. Confirm both part and serial numbers." :
                "Duplicate part/serial identity. Resolve duplicates before modifying stock.");

        var item = targets[0];
        if (item.Quantity < 0 || amount > MaximumQuantity ||
            (!isSet && item.Quantity > MaximumQuantity - amount))
            return new("Unsafe stock value. Only quantities from 0 to 1,000,000 are supported.");

        int next = isSet ? amount : item.Quantity + amount;
        var change = new AzureStockChange(item.PartNumber, item.SerialNumber,
            item.Name, item.Revision, item.Quantity, next);
        return new($"Preview only: {item.Name} (#{partNumber}/{serialNumber}) " +
                   $"quantity {item.Quantity} → {next}. Confirm in the next dialog to save.",
                   null, change);
    }

    // Re-check the exact part identity and original values after confirmation.
    // Calls William's existing PartData.EditPart; never edits parts.txt directly.
    public static bool Apply(AzureStockChange change)
    {
        var matches = PartData.GetAllParts()
            .Where(p => p.PartNumber == change.PartNumber && p.SerialNumber == change.SerialNumber)
            .ToList();
        if (matches.Count != 1) return false;

        var current = matches[0];
        if (current.Quantity != change.ExpectedQuantity ||
            current.Revision != change.ExpectedRevision ||
            !string.Equals(current.Name, change.ExpectedName, StringComparison.Ordinal))
            return false;

        if (change.NewQuantity < 0 || change.NewQuantity > MaximumQuantity) return false;
        var updated = new Part
        {
            Name = current.Name, Revision = current.Revision, PartNumber = current.PartNumber,
            SerialNumber = current.SerialNumber, Quantity = change.NewQuantity
        };
        return PartData.EditPart(current.PartNumber, current.SerialNumber, updated);
    }
}
