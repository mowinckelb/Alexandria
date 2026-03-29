/**
 * Source of truth imports — Axioms.md and Blueprint.md
 *
 * These files are imported as text at build time by wrangler (see
 * wrangler.toml [[rules]] for .md → Text). The served content is
 * always the committed .md files. No hand-maintained copies.
 */

// @ts-expect-error — wrangler resolves .md imports via [[rules]] type = "Text"
import AXIOMS_CONTENT from '../../files/private/Axioms.md';

// @ts-expect-error — wrangler resolves .md imports via [[rules]] type = "Text"
import BLUEPRINT_CONTENT from '../../files/private/Blueprint.md';

export { AXIOMS_CONTENT, BLUEPRINT_CONTENT };
