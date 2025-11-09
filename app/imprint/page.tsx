"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function ImprintPage() {
  return (
    <div className="min-h-screen w-full relative">
      {/* Content */}
      <div className="min-h-screen flex items-center justify-center p-4 py-16">
        <div className="w-full max-w-3xl">
          {/* Back Button */}
          <Link href="/" className="inline-block mb-6">
            <Badge variant="secondary" className="px-4 py-2 backdrop-blur-md cursor-pointer hover:bg-secondary/80 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2 inline" />
              Back to Home
            </Badge>
          </Link>

          {/* Frosted Glass Content Box */}
          <div className="glass rounded-2xl p-8 md:p-12 space-y-8 shadow-lg">
            <div>
              <h1 className="text-4xl font-bold mb-2">Imprint</h1>
              <p className="text-muted-foreground">Legal Information</p>
            </div>

            <div className="space-y-6 text-sm leading-relaxed">
              {/* Company Information */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Information according to § 5 TMG</h2>
                <p className="font-medium">Moritz Schäfer</p>
                <p>Riedfeldstraße 82</p>
                <p>68169 Mannheim</p>
                <p>Germany</p>
              </section>

              {/* Contact */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Contact</h2>
                <p>Email: moritz.b.schaefer@outlook.de</p>
              </section>

              {/* Responsible for Content */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Responsible for Content</h2>
                <p>According to § 55 Abs. 2 RStV:</p>
                <p>Moritz Schäfer</p>
                <p>Riedfeldstraße 82</p>
                <p>68169 Mannheim</p>
                <p>Germany</p>
              </section>

              {/* Disclaimer */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Disclaimer</h2>
                <p>
                  This website is a free, non-commercial implementation of a trivia game inspired by the Jeopardy! format. Jeopardy! is a registered trademark and the intellectual property of its respective owners. This project is not affiliated with, endorsed by, or connected to the official Jeopardy! brand or its rights holders.
                </p>
                <p className="mt-2">
                  This website is provided as a free service for educational and entertainment purposes. The operator does not claim ownership of the Jeopardy! concept or format. This is simply a free solution for those who want to play trivia games in this style.
                </p>
                <p className="mt-2">
                  Please note that this website is hosted on Vercel's free tier, which comes with certain resource limitations. Service availability and performance may be subject to these constraints.
                </p>
              </section>

              {/* Dispute Resolution */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">EU Dispute Resolution</h2>
                <p>
                  The European Commission provides a platform for online dispute resolution (OS):
                  <a
                    href="https://ec.europa.eu/consumers/odr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    https://ec.europa.eu/consumers/odr
                  </a>
                </p>
                <p className="mt-2">
                  We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
                </p>
              </section>

              {/* Liability */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Liability for Content</h2>
                <p>
                  As a service provider, we are responsible for our own content on these pages in accordance with general legislation pursuant to Section 7 (1) of the German Telemedia Act (TMG). However, according to Sections 8 to 10 of the TMG, we are not obliged as a service provider to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.
                </p>
                <p className="mt-2">
                  Obligations to remove or block the use of information under general law remain unaffected. However, liability in this regard is only possible from the time of knowledge of a specific infringement. Upon becoming aware of corresponding legal violations, we will remove this content immediately.
                </p>
              </section>

              {/* Copyright */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Copyright</h2>
                <p>
                  The content and works created by the site operators on these pages are subject to German copyright law. The reproduction, editing, distribution and any kind of use outside the limits of copyright law require the written consent of the respective author or creator. Downloads and copies of this site are only permitted for private, non-commercial use.
                </p>
                <p className="mt-2">
                  Insofar as the content on this site was not created by the operator, the copyrights of third parties are respected. In particular, third-party content is marked as such. Should you nevertheless become aware of a copyright infringement, please inform us accordingly. Upon becoming aware of legal violations, we will remove such content immediately.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
