// M9 — OS-level rules: the enforcement floor beneath the agents.
//
// The blueprint's sandbox contract: tools run sandboxed, no ambient network/filesystem, egress
// only via a declared proxy. These emitters turn a small tool spec into the real artifacts —
// a seccomp profile (syscall allow-list), an nftables ruleset (default-drop egress, proxy-only),
// and a gVisor runtimeClass — so the contract is enforced by the kernel, not by trust.

const BASELINE_SYSCALLS = [
  "read", "write", "open", "openat", "close", "stat", "fstat", "lstat", "mmap", "mprotect",
  "munmap", "brk", "rt_sigaction", "rt_sigprocmask", "access", "execve", "exit", "exit_group",
  "wait4", "clock_gettime", "futex", "getrandom", "epoll_wait", "epoll_ctl",
];

/** OCI/Docker seccomp profile: deny by default, allow a baseline + any extra syscalls. */
export function toSeccompProfile({ allow = [] } = {}) {
  return {
    defaultAction: "SCMP_ACT_ERRNO",
    architectures: ["SCMP_ARCH_X86_64", "SCMP_ARCH_AARCH64"],
    syscalls: [{ names: [...new Set([...BASELINE_SYSCALLS, ...allow])], action: "SCMP_ACT_ALLOW" }],
  };
}

/** nftables ruleset: drop all egress except loopback, DNS, and the declared egress proxy. */
export function toNftablesEgress({ proxyHost, proxyPort = 3128, dns = true } = {}) {
  if (!proxyHost) throw new Error("toNftablesEgress requires a proxyHost (egress only via a declared proxy)");
  const lines = [
    "table inet aigovops {",
    "  chain egress {",
    "    type filter hook output priority 0; policy drop;",
    "    ct state established,related accept",
    "    oif lo accept",
  ];
  if (dns) lines.push("    udp dport 53 accept", "    tcp dport 53 accept");
  lines.push(`    ip daddr ${proxyHost} tcp dport ${proxyPort} accept   # declared egress proxy only`);
  lines.push("  }", "}");
  return lines.join("\n") + "\n";
}

/** Kubernetes RuntimeClass selecting the gVisor (runsc) sandbox runtime. */
export function toRunscRuntimeClass({ name = "gvisor", handler = "runsc" } = {}) {
  return { apiVersion: "node.k8s.io/v1", kind: "RuntimeClass", metadata: { name }, handler };
}

/** One call → all three artifacts from a tool spec. */
export function sandboxFor({ allowSyscalls = [], proxyHost, proxyPort } = {}) {
  return {
    seccomp: toSeccompProfile({ allow: allowSyscalls }),
    nftables: proxyHost ? toNftablesEgress({ proxyHost, proxyPort }) : null,
    runtimeClass: toRunscRuntimeClass(),
  };
}
