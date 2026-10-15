# CI Hardening Note

This branch strengthens the repository's remote quality gate without changing application architecture or production runtime behavior.

Goals:
- deterministic dependency install from the committed lockfile;
- dependency graph validation;
- standalone TypeScript validation;
- existing Node domain suites as a remote gate;
- production build as the final CI step.

Browser/release suites remain separate because they require deployed/runtime infrastructure and should not make every source commit depend on external providers.

The legacy `next lint` script is intentionally not changed in this branch. Next 16 lint migration needs an explicit ESLint package/config decision rather than replacing lint with a non-lint command.
