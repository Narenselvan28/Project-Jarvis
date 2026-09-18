import React, { useState, useEffect } from "react";

export default function BookingReportPage({ standalone = false }) {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [selectedGuest, setSelectedGuest] = useState({
    name: "John Mark",
    plusCount: "+06",
    bookingNo: "#8238283",
    source: "Font Desks",
    guests: "7 Adults, 0 Children",
    checkIn: "20 Nov 2024, 08:00",
    checkOut: "22 Nov 2024, 11:00",
    fare: "$14,500",
    tax: "$1,500",
    total: "$16,000",
    status: "Confirmed Booking"
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All Source");
  const [selectedRows, setSelectedRows] = useState({});
  const [selectAll, setSelectAll] = useState(false);

  const initialRows = [
    { id: 1, bookingNo: "#8238283", guestName: "John Mark", plusCount: "+06", guests: "07", source: "Font Desks", dateTime: "20/11/2024 08:00", fare: "$14,500", tax: "$1500", total: "$16,000", status: "Booked" },
    { id: 2, bookingNo: "#8238275", guestName: "Robart Fox", plusCount: "+08", guests: "09", source: "Web Reservation", dateTime: "19/11/2024 14:00", fare: "$19,500", tax: "$1500", total: "$21,000", status: "Booked" },
    { id: 3, bookingNo: "#8238270", guestName: "Janny Wilson", plusCount: "+06", guests: "07", source: "Group Reservation", dateTime: "17/11/2024 20:00", fare: "$23,500", tax: "$1000", total: "$24,500", status: "Refund" },
    { id: 4, bookingNo: "#8238265", guestName: "Jecob Mara", plusCount: "+03", guests: "04", source: "Font Desks", dateTime: "16/11/2024 19:00", fare: "$14,000", tax: "$2000", total: "$16,000", status: "Booked" },
    { id: 5, bookingNo: "#8238264", guestName: "Wade Kuttar", plusCount: "+04", guests: "05", source: "Font Desks", dateTime: "14/11/2024 10:00", fare: "$12,500", tax: "$1500", total: "$14,000", status: "Refund" },
    { id: 6, bookingNo: "#8238262", guestName: "Mile Preden", plusCount: "+06", guests: "07", source: "Web Reservation", dateTime: "12/11/2024 18:00", fare: "$13,500", tax: "$1500", total: "$15,000", status: "Booked" },
    { id: 7, bookingNo: "#8238260", guestName: "Fox Anderson", plusCount: "+08", guests: "09", source: "Font Desks", dateTime: "09/11/2024 15:00", fare: "$14,500", tax: "$1500", total: "$16,000", status: "Booked" },
  ];

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowExportModal(false);
        setShowSlideOver(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    const newSelected = {};
    if (newSelectAll) {
      initialRows.forEach((r) => { newSelected[r.id] = true; });
    }
    setSelectedRows(newSelected);
  };

  const handleRowSelect = (id) => {
    setSelectedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openGuestDetails = (row) => {
    setSelectedGuest({
      name: row.guestName,
      plusCount: row.plusCount,
      bookingNo: row.bookingNo,
      source: row.source,
      guests: `${parseInt(row.guests, 10)} Adults, 0 Children`,
      checkIn: row.dateTime,
      checkOut: "22 Nov 2024, 11:00",
      fare: row.fare,
      tax: row.tax,
      total: row.total,
      status: row.status === "Booked" ? "Confirmed Booking" : "Refund Processed"
    });
    setShowSlideOver(true);
  };

  const filteredRows = initialRows.filter((r) => {
    const matchesSearch = r.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.bookingNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "All Source" || r.source.toLowerCase().includes(sourceFilter.toLowerCase());
    return matchesSearch && matchesSource;
  });

  return (
    <div className={`text-textMain font-sans flex overflow-hidden antialiased ${standalone ? "bg-white h-screen" : "flex-1 h-full flex-col bg-bgMain"}`}>
      
      {/* LEFT SIDEBAR (Only in standalone mode) */}
      {standalone && (
        <aside className="w-[260px] bg-white border-r border-borderCol flex flex-col shrink-0 z-30">
        
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-borderCol shrink-0">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center text-white text-xs font-bold mr-2 shadow-sm">
            <i className="fa-solid fa-building"></i>
          </div>
          <span className="font-bold text-lg tracking-tight text-textMain">Fixoria <sup className="text-[10px] text-textSub font-normal">TM</sup></span>
          <button className="ml-auto text-textSub hover:text-textMain transition-colors">
            <i className="fa-solid fa-bars-staggered text-sm"></i>
          </button>
        </div>

        {/* Hotel Info */}
        <div className="p-4 border-b border-borderCol shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primaryLight text-primary flex items-center justify-center text-[10px] font-bold border border-plum-100">
                <i className="fa-solid fa-hotel"></i>
              </div>
              <span className="text-sm font-semibold text-textMain">Grand Sylhet Hotel</span>
            </div>
            <i className="fa-solid fa-chevron-down text-[10px] text-textSub cursor-pointer hover:text-textMain transition-colors"></i>
          </div>
          <div className="text-[11px] text-textSub ml-7">3 admin added</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          
          {/* Daily Operation */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-textSub uppercase tracking-wider flex justify-between items-center">
              Daily Operation
              <i className="fa-solid fa-minus text-[8px] cursor-pointer hover:text-textMain transition-colors"></i>
            </div>
            <ul className="space-y-0.5">
              <li>
                <a href="#dashboard" className="flex items-center gap-3 px-3 py-2 text-sm text-textMain hover:bg-bgMain rounded-md transition-colors">
                  <i className="fa-solid fa-chart-pie text-textSub w-4 text-center"></i> Dashboard
                </a>
              </li>
              <li>
                <a href="#reservation" className="flex items-center justify-between px-3 py-2 text-sm text-textMain hover:bg-bgMain rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-calendar-check text-textSub w-4 text-center"></i> Reservation
                  </div>
                  <i className="fa-solid fa-chevron-down text-[8px] text-textSub"></i>
                </a>
              </li>
              <li>
                <a href="#rooms" className="flex items-center gap-3 px-3 py-2 text-sm text-textMain hover:bg-bgMain rounded-md transition-colors">
                  <i className="fa-solid fa-door-open text-textSub w-4 text-center"></i> Room Operation
                </a>
              </li>
              <li>
                <a href="#staff" className="flex items-center gap-3 px-3 py-2 text-sm text-textMain hover:bg-bgMain rounded-md transition-colors">
                  <i className="fa-solid fa-users-gear text-textSub w-4 text-center"></i> Manage Staff
                </a>
              </li>
              <li>
                <a href="#guests" className="flex items-center gap-3 px-3 py-2 text-sm text-textMain hover:bg-bgMain rounded-md transition-colors">
                  <i className="fa-solid fa-user-tie text-textSub w-4 text-center"></i> Manage Guests
                </a>
              </li>
              <li>
                <a href="#promotions" className="flex items-center gap-3 px-3 py-2 text-sm text-textMain hover:bg-bgMain rounded-md transition-colors">
                  <i className="fa-solid fa-tags text-textSub w-4 text-center"></i> Promotions
                </a>
              </li>
            </ul>
          </div>

          {/* Accounting */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-textSub uppercase tracking-wider flex justify-between items-center">
              Accounting
              <i className="fa-solid fa-minus text-[8px] cursor-pointer hover:text-textMain transition-colors"></i>
            </div>
            <ul className="space-y-0.5">
              <li>
                <div className="flex items-center justify-between px-3 py-2 text-sm text-textMain bg-bgMain rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-file-invoice-dollar text-textSub w-4 text-center"></i> Report
                  </div>
                  <i className="fa-solid fa-chevron-up text-[8px] text-textSub"></i>
                </div>
                {/* Submenu */}
                <ul className="ml-8 mt-1 space-y-1">
                  <li>
                    <a href="#overview" className="block px-3 py-1.5 text-xs text-textSub hover:text-textMain transition-colors">Overview</a>
                  </li>
                  <li>
                    <span className="block px-3 py-1.5 text-xs font-semibold text-primary border-l-2 border-primary transition-colors cursor-pointer">Booking Report</span>
                  </li>
                  <li>
                    <a href="#purchase" className="block px-3 py-1.5 text-xs text-textSub hover:text-textMain transition-colors">Purchase Report</a>
                  </li>
                </ul>
              </li>
              <li className="mt-2">
                <a href="#maintenance" className="flex items-center gap-3 px-3 py-2 text-sm text-textMain hover:bg-bgMain rounded-md transition-colors">
                  <i className="fa-solid fa-screwdriver-wrench text-textSub w-4 text-center"></i> Maintenance
                </a>
              </li>
            </ul>
          </div>

          {/* System Options */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-textSub uppercase tracking-wider flex justify-between items-center">
              System Options
              <i className="fa-solid fa-plus text-[8px] cursor-pointer hover:text-textMain transition-colors"></i>
            </div>
            <ul className="space-y-0.5">
              <li>
                <a href="#notifications" className="flex items-center justify-between px-3 py-2 text-sm text-textMain hover:bg-bgMain rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-bell text-textSub w-4 text-center"></i> Notifications
                  </div>
                  <span className="w-4 h-4 bg-critical text-white text-[9px] flex items-center justify-center font-bold rounded-full animate-pulse">5</span>
                </a>
              </li>
              <li>
                <a href="#support" className="flex items-center gap-3 px-3 py-2 text-sm text-textMain hover:bg-bgMain rounded-md transition-colors">
                  <i className="fa-solid fa-circle-info text-textSub w-4 text-center"></i> Support
                </a>
              </li>
            </ul>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-borderCol flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-borderCol">
            <img src="https://i.pravatar.cc/100?img=11" alt="User" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-sm font-semibold text-textMain leading-tight">Rahat Ali</div>
            <div className="text-[10px] text-textSub">Super Admin</div>
          </div>
        </div>
      </aside>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden bg-bgMain">
        
        {/* TOP BAR (Standalone mode) */}
        {standalone && (
          <header className="h-14 bg-white border-b border-borderCol flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2 text-xs text-textSub">
              <i className="fa-solid fa-house text-[10px]"></i>
              <span>/</span>
              <span>Report</span>
              <span>/</span>
              <span className="text-textMain font-medium">Booking Report</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSkeleton((prev) => !prev)}
                className="text-textSub hover:text-primary transition-colors text-xs font-medium flex items-center gap-1.5 border border-borderCol px-3 py-1.5 rounded-md hover:bg-white hover:shadow-sm"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> Toggle Skeleton
              </button>
              <button className="text-textSub hover:text-textMain transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-bgMain">
                <i className="fa-solid fa-ellipsis text-sm"></i>
              </button>
            </div>
          </header>
        )}

        {/* Action Header in App Shell mode */}
        {!standalone && (
          <div className="h-11 bg-white border-b border-borderCol flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-2 text-xs text-textSub">
              <span className="font-semibold text-textMain">Fixoria Report Telemetry</span>
              <span>•</span>
              <span>7 Verified Allocations</span>
            </div>
            <button
              onClick={() => setShowSkeleton((prev) => !prev)}
              className="text-textSub hover:text-primary transition-colors text-xs font-medium flex items-center gap-1.5 border border-borderCol px-2.5 py-1 rounded-md hover:bg-gray-50"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> Toggle Skeleton
            </button>
          </div>
        )}

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Page Header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary border border-borderCol shadow-sm">
              <i className="fa-solid fa-chart-simple text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-textMain">Booking Report</h1>
                <i className="fa-regular fa-star text-textSub cursor-pointer hover:text-yellow-400 transition-colors"></i>
              </div>
              <p className="text-xs text-textSub mt-0.5">Auto-updates in 2 min</p>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-3 gap-5 mb-8">
            
            {/* Card 1 */}
            <div className="kpi-card border border-borderCol rounded-xl p-5 bg-white shadow-soft flex flex-col justify-between h-[120px]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-medium text-textSub mb-1">Total Booking</div>
                  <div className="text-2xl font-bold text-textMain tracking-tight">1,612,132</div>
                </div>
                <svg width="80" height="40" viewBox="0 0 80 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 35 L20 30 L40 25 L60 15 L80 10" stroke="#714B67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M0 35 L20 30 L40 25 L60 15 L80 10 V40 H0 Z" fill="#714B67" fillOpacity="0.05"/>
                </svg>
              </div>
              <div className="text-[10px] text-textSub">Total booking last 365 days</div>
            </div>

            {/* Card 2 */}
            <div className="kpi-card border border-borderCol rounded-xl p-5 bg-white shadow-soft flex flex-col justify-between h-[120px]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-medium text-textSub mb-1">Total Tax</div>
                  <div className="text-2xl font-bold text-textMain tracking-tight">$1,45,520</div>
                </div>
                <svg width="80" height="40" viewBox="0 0 80 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 35 L20 25 L40 20 L60 25 L80 10" stroke="#714B67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M0 35 L20 25 L40 20 L60 25 L80 10 V40 H0 Z" fill="#714B67" fillOpacity="0.05"/>
                </svg>
              </div>
              <div className="text-[10px] text-textSub">Total tax last 365 days</div>
            </div>

            {/* Card 3 */}
            <div className="kpi-card border border-borderCol rounded-xl p-5 bg-white shadow-soft flex flex-col justify-between h-[120px]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-medium text-textSub mb-1">Total Amount</div>
                  <div className="text-2xl font-bold text-textMain tracking-tight">$2,012,132</div>
                </div>
                <svg width="80" height="40" viewBox="0 0 80 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 35 L20 30 L40 30 L60 20 L80 10" stroke="#714B67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M0 35 L20 30 L40 30 L60 20 L80 10 V40 H0 Z" fill="#714B67" fillOpacity="0.05"/>
                </svg>
              </div>
              <div className="text-[10px] text-textSub">Total amount last 365 days</div>
            </div>
          </div>

          {/* Report List Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-textMain">Report List</h2>
          </div>

          {/* Filters & Actions Toolbar */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="flex items-center justify-between w-[120px] px-3 py-1.5 bg-white border border-borderCol rounded-md text-xs font-medium text-textMain hover:border-gray-400 transition-colors shadow-sm cursor-pointer"
              >
                <option value="All Source">All Source</option>
                <option value="Font Desks">Font Desks</option>
                <option value="Web Reservation">Web Reservation</option>
                <option value="Group Reservation">Group Reservation</option>
              </select>
              <button className="flex items-center justify-between w-[110px] px-3 py-1.5 bg-white border border-borderCol rounded-md text-xs font-medium text-textMain hover:border-gray-400 transition-colors shadow-sm">
                Monthly
                <i className="fa-solid fa-chevron-down text-[8px] text-textSub"></i>
              </button>
              <button className="flex items-center justify-center w-8 h-8 bg-white border border-borderCol rounded-md text-textSub hover:text-textMain hover:border-gray-400 transition-colors shadow-sm">
                <i className="fa-solid fa-filter text-xs"></i>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-textSub text-xs"></i>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[180px] pl-8 pr-3 py-1.5 bg-white border border-borderCol rounded-md text-xs font-medium text-textMain placeholder-textSub focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
                />
              </div>
              <button
                onClick={() => { setExportFormat("pdf"); setShowExportModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-borderCol rounded-md text-xs font-medium text-textMain hover:bg-bgMain transition-colors shadow-sm"
              >
                <i className="fa-regular fa-file-pdf text-critical"></i> Export PDF
              </button>
              <button
                onClick={() => { setExportFormat("excel"); setShowExportModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-borderCol rounded-md text-xs font-medium text-textMain hover:bg-bgMain transition-colors shadow-sm"
              >
                <i className="fa-regular fa-file-excel text-success"></i> Export Excel
              </button>
            </div>
          </div>

          {/* Data Table Container */}
          <div className="border border-borderCol rounded-xl overflow-hidden shadow-soft bg-white">
            
            {/* Skeleton Loader */}
            {showSkeleton ? (
              <div className="p-6 space-y-4">
                <div className="h-8 skeleton rounded w-1/4 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-10 skeleton rounded"></div>
                  <div className="h-10 skeleton rounded"></div>
                  <div className="h-10 skeleton rounded"></div>
                  <div className="h-10 skeleton rounded"></div>
                  <div className="h-10 skeleton rounded"></div>
                </div>
              </div>
            ) : (
              /* Actual Table Content */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-borderCol text-[10px] font-semibold text-textSub uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-[50px]">
                        <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                      </th>
                      <th className="py-3.5 px-4">Booking No</th>
                      <th className="py-3.5 px-4">Name of Guest</th>
                      <th className="py-3.5 px-4 text-center">Guests</th>
                      <th className="py-3.5 px-4">Source</th>
                      <th className="py-3.5 px-4">Booking Date & Time</th>
                      <th className="py-3.5 px-4">Fare</th>
                      <th className="py-3.5 px-4">Tax</th>
                      <th className="py-3.5 px-4">Total Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-textMain divide-y divide-borderCol">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-bgMain transition-colors group">
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={!!selectedRows[row.id]}
                            onChange={() => handleRowSelect(row.id)}
                          />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-textSub">{row.bookingNo}</td>
                        <td
                          className="py-3.5 px-4 font-medium cursor-pointer hover:text-primary transition-colors"
                          onClick={() => openGuestDetails(row)}
                        >
                          {row.guestName}, {row.plusCount}
                        </td>
                        <td className="py-3.5 px-4 text-center">{row.guests}</td>
                        <td className="py-3.5 px-4">{row.source}</td>
                        <td className="py-3.5 px-4">{row.dateTime}</td>
                        <td className="py-3.5 px-4">{row.fare}</td>
                        <td className="py-3.5 px-4">{row.tax}</td>
                        <td className="py-3.5 px-4 font-medium">{row.total}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`status-pill inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${
                              row.status === "Booked"
                                ? "bg-primaryLight text-primary"
                                : "bg-criticalLight text-critical"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-textSub cursor-pointer hover:text-textMain transition-colors">
                          <i className="fa-solid fa-ellipsis"></i>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 px-2">
            <button className="flex items-center gap-1.5 text-xs font-medium text-textSub hover:text-textMain transition-colors">
              <i className="fa-solid fa-arrow-left text-[10px]"></i> Previous
            </button>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 flex items-center justify-center rounded border border-primary bg-primary text-white text-xs font-medium shadow-sm">1</button>
              <button className="w-7 h-7 flex items-center justify-center rounded border border-borderCol hover:bg-bgMain text-xs font-medium text-textMain transition-colors">2</button>
              <span className="px-1 text-xs text-textSub">...</span>
              <button className="w-7 h-7 flex items-center justify-center rounded border border-borderCol hover:bg-bgMain text-xs font-medium text-textMain transition-colors">10</button>
              <button className="w-7 h-7 flex items-center justify-center rounded border border-borderCol hover:bg-bgMain text-xs font-medium text-textMain transition-colors">12</button>
              <button className="w-7 h-7 flex items-center justify-center rounded border border-borderCol hover:bg-bgMain text-xs font-medium text-textMain transition-colors">13</button>
              <button className="w-7 h-7 flex items-center justify-center rounded border border-borderCol hover:bg-bgMain text-xs font-medium text-textMain transition-colors">14</button>
            </div>
            <button className="flex items-center gap-1.5 text-xs font-medium text-textMain hover:text-primary transition-colors">
              Next <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>

        </div>
      </main>

      {/* OVERLAY BACKGROUND */}
      {(showExportModal || showSlideOver) && (
        <div
          onClick={() => { setShowExportModal(false); setShowSlideOver(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] transition-opacity"
        />
      )}

      {/* MODAL: EXPORT */}
      {showExportModal && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white border border-borderCol rounded-xl shadow-float z-[100] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-borderCol">
            <div>
              <h3 className="text-base font-semibold text-textMain">Export Report</h3>
              <p className="text-xs text-textSub mt-0.5">Choose format and date range</p>
            </div>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-8 h-8 flex items-center justify-center text-textSub hover:text-textMain hover:bg-bgMain rounded-full transition-colors"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-textSub mb-1.5">Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportFormat("pdf")}
                  className={`flex items-center justify-center gap-2 border text-xs font-medium py-2.5 rounded-md transition-colors ${
                    exportFormat === "pdf"
                      ? "border-primary bg-primaryLight text-primary"
                      : "border-borderCol bg-white text-textMain hover:bg-bgMain"
                  }`}
                >
                  <i className="fa-regular fa-file-pdf text-critical"></i> PDF
                </button>
                <button
                  onClick={() => setExportFormat("excel")}
                  className={`flex items-center justify-center gap-2 border text-xs font-medium py-2.5 rounded-md transition-colors ${
                    exportFormat === "excel"
                      ? "border-primary bg-primaryLight text-primary"
                      : "border-borderCol bg-white text-textMain hover:bg-bgMain"
                  }`}
                >
                  <i className="fa-regular fa-file-excel text-success"></i> Excel
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-textSub mb-1.5">Date Range</label>
              <select className="w-full border border-borderCol bg-white p-2.5 text-sm rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-textMain">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Year to date</option>
                <option>Custom range...</option>
              </select>
            </div>
          </div>
          <div className="p-4 border-t border-borderCol bg-bgMain flex justify-end gap-2 rounded-b-xl">
            <button
              onClick={() => setShowExportModal(false)}
              className="px-4 py-2 text-xs font-medium border border-borderCol bg-white hover:bg-bgMain text-textMain rounded-md transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                alert(`Exporting Booking Report in ${exportFormat.toUpperCase()} format...`);
                setShowExportModal(false);
              }}
              className="px-4 py-2 text-xs font-medium bg-primary text-white border border-primary hover:bg-primaryHover rounded-md transition-colors shadow-sm"
            >
              Export Now
            </button>
          </div>
        </div>
      )}

      {/* SLIDE-OVER: GUEST DETAILS */}
      <div className={`slide-over fixed inset-y-0 right-0 w-[450px] bg-white border-l border-borderCol shadow-float z-[100] flex flex-col ${showSlideOver ? "open" : ""}`}>
        <div className="flex items-center justify-between p-6 border-b border-borderCol shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-borderCol">
              <img src="https://i.pravatar.cc/100?img=12" alt="Guest" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-textMain">{selectedGuest.name}</h3>
              <p className="text-xs text-textSub">Booking {selectedGuest.bookingNo}</p>
            </div>
          </div>
          <button
            onClick={() => setShowSlideOver(false)}
            className="w-8 h-8 flex items-center justify-center text-textSub hover:text-textMain hover:bg-bgMain rounded-full transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Detail Sections */}
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-textSub mb-3">Booking Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-textSub block text-[10px]">Source</span><span className="font-medium">{selectedGuest.source}</span></div>
              <div><span className="text-textSub block text-[10px]">Guests</span><span className="font-medium">{selectedGuest.guests}</span></div>
              <div><span className="text-textSub block text-[10px]">Check-in</span><span className="font-medium">{selectedGuest.checkIn}</span></div>
              <div><span className="text-textSub block text-[10px]">Check-out</span><span className="font-medium">{selectedGuest.checkOut}</span></div>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-textSub mb-3">Payment Summary</h4>
            <div className="border border-borderCol rounded-lg overflow-hidden">
              <div className="flex justify-between px-4 py-2.5 text-sm border-b border-borderCol">
                <span className="text-textSub">Fare</span><span className="font-medium">{selectedGuest.fare}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm border-b border-borderCol">
                <span className="text-textSub">Tax</span><span className="font-medium">{selectedGuest.tax}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm bg-bgMain">
                <span className="font-semibold">Total</span><span className="font-bold text-primary">{selectedGuest.total}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-textSub mb-3">Status</h4>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primaryLight text-primary">
              {selectedGuest.status}
            </span>
          </div>
        </div>
        <div className="p-6 border-t border-borderCol bg-bgMain flex gap-3 shrink-0">
          <button
            onClick={() => setShowSlideOver(false)}
            className="flex-1 py-2.5 text-xs font-medium border border-borderCol bg-white hover:bg-bgMain text-textMain rounded-md transition-colors shadow-sm"
          >
            Close
          </button>
          <button
            onClick={() => alert(`Invoice sent to ${selectedGuest.name} for ${selectedGuest.total}`)}
            className="flex-1 py-2.5 text-xs font-medium bg-primary text-white border border-primary hover:bg-primaryHover rounded-md transition-colors shadow-sm"
          >
            Send Invoice
          </button>
        </div>
      </div>

    </div>
  );
}
