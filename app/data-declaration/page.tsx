"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DataDeclarationPage() {
  return (
    <div className="min-h-screen w-full relative">
      {/* Content */}
      <div className="min-h-screen flex items-center justify-center p-4 py-16">
        <div className="w-full max-w-3xl">
          {/* Back Button */}
          <Link href="/">
            <Button variant="outline" className="mb-6 glass">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          {/* Frosted Glass Content Box */}
          <div className="glass-strong rounded-2xl p-8 md:p-12 space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Data Protection Declaration</h1>
              <p className="text-muted-foreground">Privacy Policy</p>
            </div>

            <div className="space-y-6 text-sm leading-relaxed">
              {/* Introduction */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">1. Data Protection at a Glance</h2>
                <h3 className="text-lg font-medium mt-4">General Information</h3>
                <p>
                  The following information provides a simple overview of what happens to your personal data when you visit this website. This website does not actively collect any personal data beyond what is necessary for the technical provision of the website.
                </p>
              </section>

              {/* Data Collection */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">2. Data Collection on this Website</h2>
                <h3 className="text-lg font-medium mt-4">Who is responsible for data collection on this website?</h3>
                <p>
                  Data processing on this website is carried out by the website operator. You can find the contact details in the imprint section.
                </p>
                <p className="font-medium mt-2">Moritz Schäfer</p>
                <p>Riedfeldstraße 82</p>
                <p>68169 Mannheim</p>
                <p>Germany</p>
                <p className="mt-2">Email: moritz.b.schaefer@outlook.de</p>

                <h3 className="text-lg font-medium mt-4">How is data collected on this website?</h3>
                <p>
                  This website does not actively collect personal data from users. The website operates as a client-side application where game data is temporarily stored in your browser's local storage and is not transmitted to any server or database operated by us.
                </p>
                <p className="mt-2">
                  Technical data may be automatically collected by our hosting provider (Vercel) when you visit the website. This is mainly technical data such as:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Referrer URL</li>
                  <li>Hostname of the accessing computer</li>
                  <li>Time of server request</li>
                  <li>IP address</li>
                </ul>
                <p className="mt-2">
                  This data is collected automatically by Vercel's infrastructure for security and performance purposes. We do not have direct access to this data.
                </p>

                <h3 className="text-lg font-medium mt-4">What rights do you have regarding your data?</h3>
                <p>
                  You have the right to receive information about the origin, recipient and purpose of your stored personal data free of charge at any time. You also have the right to request the correction or deletion of this data. You also have the right, under certain circumstances, to request the restriction of the processing of your personal data. Furthermore, you have the right to lodge a complaint with the competent supervisory authority.
                </p>
                <p className="mt-2">
                  You can contact us at any time if you have further questions on the subject of data protection at moritz.b.schaefer@outlook.de
                </p>
              </section>

              {/* Hosting */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">3. Hosting</h2>
                <h3 className="text-lg font-medium mt-4">Vercel</h3>
                <p>
                  This website is hosted by Vercel Inc. The hosting provider automatically collects and stores information in so-called server log files, which your browser automatically transmits to us. This information includes:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Browser type and version</li>
                  <li>Operating system used</li>
                  <li>Referrer URL</li>
                  <li>Hostname of the accessing computer</li>
                  <li>Time of the server request</li>
                  <li>IP address</li>
                </ul>
                <p className="mt-4">
                  This data is not combined with other data sources. The collection of this data is based on Art. 6 para. 1 lit. f GDPR. The website operator has a legitimate interest in the technically error-free presentation and optimization of its website.
                </p>
                <p className="mt-4">
                  Provider details:
                </p>
                <p className="font-medium">Vercel Inc.</p>
                <p>440 N Barranca Avenue #4133</p>
                <p>Covina, CA 91723</p>
                <p>United States</p>
                <p className="mt-2">
                  For more information on how Vercel handles data, please see their privacy policy at:{" "}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    https://vercel.com/legal/privacy-policy
                  </a>
                </p>
              </section>

              {/* General Information */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">4. General Information and Mandatory Information</h2>
                <h3 className="text-lg font-medium mt-4">Data Protection</h3>
                <p>
                  The operator of this website takes the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with statutory data protection regulations and this privacy policy.
                </p>
                <p className="mt-2">
                  We would like to point out that data transmission over the Internet (e.g. when communicating by email) may have security gaps. Complete protection of data against access by third parties is not possible.
                </p>
              </section>

              {/* Legal Basis */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">5. Legal Basis for Data Processing</h2>
                <p>
                  The processing of the technical data by our hosting provider is based on Art. 6 para. 1 lit. f GDPR (legitimate interests). The website operator has a legitimate interest in the technically error-free presentation and optimization of the website.
                </p>
              </section>

              {/* Rights */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">6. Your Rights</h2>
                <p>You have the following rights with regard to your personal data:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Right to information (Art. 15 GDPR)</li>
                  <li>Right to rectification (Art. 16 GDPR)</li>
                  <li>Right to deletion (Art. 17 GDPR)</li>
                  <li>Right to restriction of processing (Art. 18 GDPR)</li>
                  <li>Right to data portability (Art. 20 GDPR)</li>
                  <li>Right to object (Art. 21 GDPR)</li>
                  <li>Right to lodge a complaint with a supervisory authority (Art. 77 GDPR)</li>
                </ul>
                <p className="mt-4">
                  If you would like to exercise any of these rights, please contact us at the contact details provided in the imprint.
                </p>
              </section>

              {/* Local Storage */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">7. Local Storage</h2>
                <p>
                  This website uses your browser's local storage to temporarily store game data, such as player names, game codes, and game states. This data is stored exclusively in your browser and is not transmitted to any server. You can delete this data at any time by clearing your browser's local storage or cache.
                </p>
              </section>

              {/* Contact */}
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">8. Contact</h2>
                <p>
                  If you have any questions about data protection, please contact us at:
                </p>
                <p className="mt-2">Email: moritz.b.schaefer@outlook.de</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
