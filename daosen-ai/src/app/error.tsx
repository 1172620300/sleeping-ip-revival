"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { errorRef.current?.focus(); }, []);
  return <div ref={errorRef} className="page-error" role="alert" tabIndex={-1}><h1>页面暂时无法读取</h1><p>演示服务可能尚未就绪。请确认数据库已启动并完成初始化，然后重试。</p><div className="page-actions"><Button onClick={reset}>重新加载</Button><Link href="/" className="btn btn-secondary">返回总览</Link></div></div>;
}
