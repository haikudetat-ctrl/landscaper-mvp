export type { Json, Database } from "./database.generated";

import type { Database } from "./database.generated";

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];

export type Inserts<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];

export type Updates<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];

export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];

export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
