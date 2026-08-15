// import { SearchPortal } from "@/components/search-portal";

// export default function SearchPage() {
//   return (
//     <main className="app-shell">
//       <section className="summary-band">
//         <div>
//           <h1>Search learners</h1>
//           <p>Name and DOB searches run across all exam events. Select an event when you want a scholar-number search for one event only.</p>
//         </div>
//       </section>
//       <SearchPortal />
//     </main>
//   );
// }
import { SearchPortal } from "@/components/search-portal";

export default function SearchPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* Official VMOU One View Style Header Strip */}
      <div className="bg-blue-900 text-white font-semibold px-4 py-2 text-sm rounded-t-lg tracking-wide uppercase">
        ONE VIEW
      </div>

      {/* Instructions Box (Similar to VMOU Portal) */}
      <div className="bg-white border border-blue-900/30 rounded-b-lg shadow-sm p-6 mb-6">
        <div className="text-sm text-gray-800 space-y-2">
          <p className="font-semibold text-blue-900 mb-2">निर्देश (Instructions):</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>विद्यार्थी अपने नाम या अपने स्कॉलर नंबर द्वारा अपनी प्रवेश स्थिति की जानकारी प्राप्त कर सकते हैं।</li>
            <li>नाम द्वारा जानकारी प्राप्त करने के लिए नीचे दिए गए सर्च पोर्टल का उपयोग करें।</li>
            <li>विद्यार्थी सूची में अपना नाम चुनकर और स्कॉलर नंबर द्वारा अपनी परीक्षा परिणाम की जानकारी प्राप्त कर सकते हैं।</li>
          </ol>
        </div>
      </div>

      {/* Search Portal Component */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <SearchPortal />
      </div>
    </main>
  );
}