/**
 * src/middleware/validate.js
 *
 * Generic Zod validation middleware factory.
 *
 * Usage:
 *   router.post("/endpoint", validate(myZodSchema), controller);
 *
 * If validation fails, it returns a 422 with a structured list of errors.
 * If validation passes, req.body is replaced with the *parsed* (cleaned) data.
 */

const { ZodError } = require("zod");

/**
 * @param {import('zod').ZodSchema} schema - A Zod schema to validate req.body against
 * @returns Express middleware function
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      // schema.parse() throws ZodError on failure, returns cleaned data on success.
      // This also strips any extra fields not in the schema (safeParse keeps them).
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod's error array into a clean response
        const errors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));

        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      // Unexpected error — let global error handler deal with it
      next(error);
    }
  };
}

module.exports = validate;
