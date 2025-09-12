import { useEffect, useState } from "react";
import { ethers } from "ethers";
import artifact from "../abi.json"; // import the full artifact
import { CONTRACT_ADDRESS } from "../config";

const CAT = { Food: 0, Transport: 1, Medicine: 2 };

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [addr, setAddr] = useState("");
  const [contract, setContract] = useState(null);

  // Sender form
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(""); // in MON
  const [category, setCategory] = useState("Food");
  const [minutes, setMinutes] = useState(10);

  // Vendor
  const [vendorCat, setVendorCat] = useState("Food");

  // Recipient spend
  const [lockId, setLockId] = useState("");
  const [vendor, setVendor] = useState("");

  // Extract ABI array from artifact
  const abi = artifact.abi;

  useEffect(() => {
    if (!window.ethereum) return;
    const p = new ethers.BrowserProvider(window.ethereum);
    setProvider(p);
  }, []);

  const connect = async () => {
    if (!provider) return alert("Install a wallet");
    try {
      await provider.send("eth_requestAccounts", []);
      const s = await provider.getSigner();
      setSigner(s);
      setAddr(await s.getAddress());
      const c = new ethers.Contract(CONTRACT_ADDRESS, abi, s);
      setContract(c);
      alert("✅ Connected to contract");
    } catch (err) {
      console.error("Connection failed:", err);
      alert("❌ Connection failed: " + (err.reason || err.message));
    }
  };

  const lockFunds = async () => {
  if (!contract) return alert("Contract not connected");
  try {
    const expiry = BigInt(Math.floor(Date.now() / 1000) + Number(minutes) * 60);
    const value = ethers.parseEther(amount || "0");

    const tx = await contract.lockFunds(recipient, CAT[category], expiry, { value });
    const receipt = await tx.wait();

    // Parse FundsLocked event from receipt to get the lock ID
    const event = receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .find(e => e.name === "FundsLocked");

    if (event) {
      const lockId = event.args.id.toString();
      alert(`✅ Funds locked! Lock ID = ${lockId}`);
    } else {
      alert("✅ Funds locked!");
    }
  } catch (err) {
    console.error("lockFunds error:", err);
    alert("❌ Failed: " + (err.reason || err.message));
  }
};


  const registerVendor = async () => {
    if (!contract) return;
    try {
      const tx = await contract.registerVendor(CAT[vendorCat]);
      await tx.wait();
      alert("✅ Vendor registered!");
    } catch (err) {
      console.error("registerVendor error:", err);
      alert("❌ Failed: " + (err.reason || err.message));
    }
  };

  const spendFunds = async () => {
    if (!contract) return;
    try {
      const tx = await contract.spendFunds(lockId, vendor);
      await tx.wait();
      alert("✅ Spent to vendor!");
    } catch (err) {
      console.error("spendFunds error:", err);
      alert("❌ Failed: " + (err.reason || err.message));
    }
  };

  const refund = async () => {
    if (!contract) return;
    try {
      const tx = await contract.refund(lockId);
      await tx.wait();
      alert("✅ Refunded (if expired)!");
    } catch (err) {
      console.error("refund error:", err);
      alert("❌ Failed: " + (err.reason || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">⏳ Time-Locked Emergency Wallet</h1>
          <button onClick={connect} className="px-4 py-2 rounded-xl bg-black text-white">
            {addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "Connect"}
          </button>
        </header>

        {/* Sender */}
        <section className="bg-white rounded-2xl p-5 shadow">
          <h2 className="text-xl font-semibold mb-3">1) Sender: Lock Funds</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              className="border p-3 rounded-xl"
              placeholder="Recipient address"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
            />
            <input
              className="border p-3 rounded-xl"
              placeholder="Amount (MON)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <select
              className="border p-3 rounded-xl"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option>Food</option>
              <option>Transport</option>
              <option>Medicine</option>
            </select>
            <input
              type="number"
              className="border p-3 rounded-xl"
              placeholder="Expiry (minutes)"
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
            />
          </div>
          <button
            onClick={lockFunds}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white"
          >
            Lock
          </button>
        </section>

        {/* Vendor */}
        <section className="bg-white rounded-2xl p-5 shadow">
          <h2 className="text-xl font-semibold mb-3">2) Vendor: Register Category</h2>
          <div className="flex gap-3">
            <select
              className="border p-3 rounded-xl"
              value={vendorCat}
              onChange={e => setVendorCat(e.target.value)}
            >
              <option>Food</option>
              <option>Transport</option>
              <option>Medicine</option>
            </select>
            <button
              onClick={registerVendor}
              className="px-4 py-2 rounded-xl bg-green-600 text-white"
            >
              Register
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Call this once from the vendor wallet.</p>
        </section>

        {/* Recipient */}
        <section className="bg-white rounded-2xl p-5 shadow">
          <h2 className="text-xl font-semibold mb-3">3) Recipient: Spend or Refund</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <input
              className="border p-3 rounded-xl"
              placeholder="Lock ID"
              value={lockId}
              onChange={e => setLockId(e.target.value)}
            />
            <input
              className="border p-3 rounded-xl"
              placeholder="Vendor address"
              value={vendor}
              onChange={e => setVendor(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={spendFunds}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white"
              >
                Spend
              </button>
              <button
                onClick={refund}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white"
              >
                Refund
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Refund works only after expiry & if not spent.</p>
        </section>
      </div>
    </div>
  );
}