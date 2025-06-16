import fs from "node:fs";
import path from "node:path";

export function validateConfig(): void {
    const configPath = path.resolve(__dirname, "..", "..", "config.json");

    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found at path: ${configPath}`);
    }

    let rawData: string;
    try {
        rawData = fs.readFileSync(configPath, "utf-8");
    } catch (err) {
        throw new Error(`Error reading config file: ${err}`);
    }

    // Remove BOM if present
    if (rawData.charCodeAt(0) === 0xFEFF) {
        rawData = rawData.slice(1);
    }

    let parsedConfig: any;
    try {
        parsedConfig = JSON.parse(rawData);
    } catch (err) {
        throw new Error(`Invalid JSON in config file: ${err}`);
    }

    if (typeof parsedConfig !== "object" || parsedConfig === null) {
        throw new Error("Config file must contain a valid JSON object.");
    }

    // Define expected config schema
    const expectedSchema: Record<string, "string" | "number" | "boolean" | "object" | "array"> = {
        guildId: "string",
        botChannelId: "string",
        musicinfoPath: "string",
        wordlistPath: "string"
    };

    const errors: string[] = [];

    for (const [key, expectedType] of Object.entries(expectedSchema)) {
        const value = parsedConfig[key];
        const actualType = Array.isArray(value) ? "array" : typeof value;

        if (actualType !== expectedType) {
            errors.push(`Missing or invalid '${key}' (expected ${expectedType}, got ${actualType})`);
        }
    }

    if (errors.length > 0) {
        throw new Error("Config validation error(s):\n" + errors.join("\n"));
    }
}
