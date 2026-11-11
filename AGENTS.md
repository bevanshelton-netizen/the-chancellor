# Mandatory NODE01 identity instructions for AI agents and contributors

**NODE01 IS SOFTWARE. NODE01 IS NOT PHYSICAL INFRASTRUCTURE.**

Treat NODE01 only as IZAKHONO's stable logical software/runtime identity. Never describe it as a server, computer, machine, laptop, VM, hardware device, hostname, cloud instance, container host or network appliance.

The execution environment is a separate, replaceable resource. Keep these concepts distinct: `logical_node_id: NODE01`; `identity_type: software-runtime`; `runtime_host` is only the locator of the separate execution environment; `runtime_host_is_separate: true`.

Changing, moving, replacing, scaling or losing the execution environment does not change NODE01's identity. Apply this rule in source code, APIs, JSON/YAML, infrastructure-as-code, CI/CD, installers, logs, monitoring, telemetry, product copy, documentation and generated code.

Before accepting a change, run `python3 scripts/architecture/check-node01-identity.py`. Do not weaken the architecture gate to make a failing change pass. Correct the conflicting definition. Canonical policy: `architecture/NODE01-IDENTITY-STANDARD.md`.
