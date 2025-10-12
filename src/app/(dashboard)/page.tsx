import Image from "next/image";
import logo from "../logo.png";

export default function HomePage() {
  return (
    <section className="flex flex-col items-center text-center px-6 py-16">
      <Image src={logo} alt="Logo" width={64} height={64} className="mb-4" />
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-green-800">
        Helping Businesses Navigate Green Accounting with Confidence
      </h1>
      <p className="text-gray-600 max-w-2xl mb-6">
        Trusted by sustainability leaders to ensure compliance with GHG Protocol, ISO 14001, and ESG standards. Access expert consulting and our AI-powered GreenGPT tool for accurate, actionable insights.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Enter your email"
          className="border border-green-700 rounded px-4 py-2 w-64"
        />
        <button className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800">
          Join Free
        </button>
      </div>
    </section>
  );
}
