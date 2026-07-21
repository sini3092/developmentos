export const object = (properties = {}, required = []) => ({
  type: "object", properties, required, additionalProperties: false,
})
export const string = (description, extra = {}) => ({ type: "string", description, ...extra })
export const nullableString = (description) => ({ type: ["string", "null"], description })
export const integer = (description, extra = {}) => ({ type: "integer", description, ...extra })
export const boolean = (description, extra = {}) => ({ type: "boolean", description, ...extra })
export const enumString = (description, values) => ({ type: "string", description, enum: values })

export function assertInput(schema, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Tool input must be an object")
  for (const key of schema.required ?? []) {
    if (input[key] === undefined || input[key] === null || input[key] === "") throw new Error(`Missing required input: ${key}`)
  }
  const allowed = new Set(Object.keys(schema.properties ?? {}))
  for (const key of Object.keys(input)) if (!allowed.has(key)) throw new Error(`Unknown input field: ${key}`)
}
