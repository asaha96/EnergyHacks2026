"use client"

import React, { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Lock, CheckCircle2, AlertCircle, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LogEntry {
    id: string
    timestamp: string
    message: string
    type: "info" | "waring" | "success" | "error"
    scope?: string
}

interface SecurityLogProps {
    logs: LogEntry[]
    title?: string
}

export function SecurityLog({ logs, title = "Secure Agent Handshake" }: SecurityLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    return (
        <div className="rounded-lg border bg-zinc-950 text-zinc-50 font-mono text-sm overflow-hidden shadow-xl">
            <div className="flex items-center gap-2 bg-zinc-900 border-b border-zinc-800 px-4 py-2">
                <Terminal className="h-4 w-4 text-zinc-400" />
                <span className="font-semibold text-xs uppercase tracking-wider text-zinc-400">{title}</span>
                <div className="ml-auto flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/20" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/20" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500/20" />
                </div>
            </div>

            <div
                ref={scrollRef}
                className="h-[200px] overflow-y-auto p-4 space-y-2 scroll-smooth"
            >
                <AnimatePresence initial={false}>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3"
                        >
                            <span className="text-zinc-500 shrink-0 select-none">[{log.timestamp}]</span>
                            <div className="flex-1 break-words">
                                <span className={cn(
                                    log.type === "error" && "text-red-400",
                                    log.type === "success" && "text-green-400",
                                    log.type === "waring" && "text-yellow-400",
                                    log.type === "info" && "text-zinc-300",
                                )}>
                                    {log.message}
                                </span>
                                {log.scope && (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                                        <Lock className="h-2 w-2" />
                                        {log.scope}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-zinc-600 italic">Waiting for agent request...</div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
