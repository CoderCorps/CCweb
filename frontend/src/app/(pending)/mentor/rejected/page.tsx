"use client";

import React from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { XCircle, AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAssetUrl } from "@/lib/utils";

export default function RejectedMentorPage() {
  const { user, logout } = useAuth();

  if (!user || user.role !== "mentor" || user.status !== "rejected") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Brand Logo */}
      <div className="mb-8 flex items-center gap-2">
        <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={40} height={40} className="object-contain" unoptimized priority />
        <span className="font-bold text-2xl text-foreground">Coder<span className="text-primary">Corps</span></span>
      </div>

      <Card className="max-w-md w-full text-center border-border/40 shadow-xl bg-card">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Account Not Approved</CardTitle>
          <CardDescription className="text-base mt-2 text-muted-foreground">
            Your application to become a Mentor was not approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 p-4 rounded-xl flex gap-3 text-left border border-destructive/20 text-muted-foreground text-sm">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Review Complete</p>
              <p className="mt-1 leading-relaxed">
                After reviewing your application, our administrators have decided not to activate your mentor account.
                Please check your email for any specific feedback or contact support for details.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/40 bg-muted/10 p-4 rounded-b-xl">
          <Button variant="ghost" onClick={logout} className="gap-2 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
