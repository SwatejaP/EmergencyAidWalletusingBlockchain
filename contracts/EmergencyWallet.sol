import { useEffect, useState } from "react";
import { ethers } from "ethers";
import artifact from "../abi.json";
import { CONTRACT_ADDRESS } from "../config";

const CAT = { Food: 0, Transport: 1, Medicine: 2 };
const CAT_NAMES = ["Food", "Transport", "Medicine"];

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [addr, setAddr] = useState("");
  const [contract, setContract] = useState(null);

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [minutes, setMinutes] = useState(10);

  const [vendorCat, setVendorCat] = useState("Food");
  const [vendor, setVendor] = useState("");

  const [locks, setLocks] = useState([]);

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
      const address = await s.getAddress();
      setAddr(address);

      const c = new ethers.Contract(CONTRACT_ADDRESS, abi, s);
      setContract(c);

      // Fetch all past events for this recipient
      fetchLocks(c, address);

      // Listen for new FundsLocked events in real-time
      c.on("FundsLocked", (id, sender, recipientAddr, amount, category, expiry) => {
        if (recipientAddr.toLowerCase() === address.toLowerCase()) {
          setLocks(prev => [
            ...prev,
            {
              id: id.toString(),
              sender,
              recipient: recipientAddr,
              amount: ethers.formatEther(amount),
              category: CAT_NAMES[category],
              expiry: new Date(Number(expiry) * 1000).toLocaleString(),
            },
          ]);
        }
      });

      alert("✅ Connected");
    } catch (err) {
      console.error(err);
      alert("❌ Connection failed: " + (err.reason || err.message));
    }
  };

  // Fetch all past FundsLocked events for the connected recipient
  const fetchLocks = async (c, userAddress) => {
    try {
      const allEvents = await c.queryFilter(c.filters.FundsLocked());
      const userLocks = allEvents
        .filter(e => e.args.recipient.toLowerCase() === userAddress.toLowerCase())
        .map(e => ({
          id: e.args.id.toString(),
          sender: e.args.sender,
          recipient: e.args.recipient,
          amount: ethers.formatEther(e.args.amount),
          category: CAT_NAMES[e.args.category],
          expiry: new Date(Number(e.args.expiry) * 1000).toLocaleString(),
        }));
      setLocks(userLocks);
    } catch (err) {
      console.error("fetchLocks error:", err);
    }
  };

  const lockFunds = async () => {
    if (!contract) return alert("Connect wallet");
    try {
      const expiry = Math.floor(Date.now() / 1000) + Number(minutes) * 60;
      const value = ethers.parseEther(amount || "0");

      const tx = await contract.lockFunds(recipient, CAT[category], expiry, { value });
      await tx.wait();

      // No need to manually fetch here; event listener will update locks
      alert("✅ Funds locked!");
    } catch (err) {
      console.error(err);
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
      console.error(err);
      alert("❌ Failed: " + (err.reason || err.message));
    }
  };

  const spendFunds = async (lockId) => {
    if (!contract) return;
    try {
      const tx = await contract.spendFunds(lockId, vendor);
      await tx.wait();
      alert("✅ Spent to vendor!");
      fetchLocks(contract, addr);
    } catch (err) {
      console.error(err);
      alert("❌ Failed: " + (err.reason || err.message));
    }
  };

  const refund = async (lockId) => {
    if (!contract) return;
    try {
      const tx = await contract.refund(lockId);
      await tx.wait();
      alert("✅ Refunded (if expired)!");
      fetchLocks(contract, addr);
    } catch (err) {
      console.error(err);
      alert("❌ Failed: " + (err.reason || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
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
            <input placeholder="Recipient address" value={recipient} onChange={e => setRecipient(e.target.value)} className="border p-3 rounded-xl"/>
            <input placeholder="Amount (MON)" value={amount} onChange={e => setAmount(e.target.value)} className="border p-3 rounded-xl"/>
            <select value={category} onChange={e => setCategory(e.target.value)} className="border p-3 rounded-xl">
              <option>Food</option>
              <option>Transport</option>
              <option>Medicine</option>
            </select>
            <input type="number" placeholder="Expiry (minutes)" value={minutes} onChange={e => setMinutes(e.target.value)} className="border p-3 rounded-xl"/>
          </div>
          <button onClick={lockFunds} className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white">Lock</button>
        </section>

        {/* Vendor */}
        <section className="bg-white rounded-2xl p-5 shadow">
          <h2 className="text-xl font-semibold mb-3">2) Vendor: Register Category</h2>
          <div className="flex gap-3">
            <select value={vendorCat} onChange={e => setVendorCat(e.target.value)} className="border p-3 rounded-xl">
              <option>Food</option>
              <option>Transport</option>
              <option>Medicine</option>
            </select>
            <button onClick={registerVendor} className="px-4 py-2 rounded-xl bg-green-600 text-white">Register</button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Call this once from the vendor wallet.</p>
        </section>

        {/* Recipient */}
        <section className="bg-white rounded-2xl p-5 shadow">
          <h2 className="text-xl font-semibold mb-3">3) Recipient: Spend or Refund</h2>
          <input placeholder="Vendor address" value={vendor} onChange={e => setVendor(e.target.value)} className="border p-3 rounded-xl w-full mb-3"/>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">Lock ID</th>
                  <th className="p-2 border">Amount</th>
                  <th className="p-2 border">Category</th>
                  <th className="p-2 border">Expiry</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locks.map(l => (
                  <tr key={l.id}>
                    <td className="p-2 border">{l.id}</td>
                    <td className="p-2 border">{l.amount} MON</td>
                    <td className="p-2 border">{l.category}</td>
                    <td className="p-2 border">{l.expiry}</td>
                    <td className="p-2 border">
                      <button onClick={() => spendFunds(l.id)} className="px-2 py-1 bg-purple-600 text-white rounded mr-2">Spend</button>
                      <button onClick={() => refund(l.id)} className="px-2 py-1 bg-gray-700 text-white rounded">Refund</button>
                    </td>
                  </tr>
                ))}
                {!locks.length && (
                  <tr>
                    <td colSpan="5" className="p-3 text-center">No locks found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
