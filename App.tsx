
import React, { useState, useRef, useEffect } from 'react';
import { ReportData } from './types';
import { GoogleGenAI, Type } from "@google/genai";

/**
 * =====================================================================
 * KONFIGURASI PENTADBIR:
 * Masukkan link Apps Script anda di sini supaya guru lain boleh terus guna.
 * =====================================================================
 */
const GOOGLE_APPS_SCRIPT_URL = "MASUKKAN_LINK_APPS_SCRIPT_ANDA_DI_SINI"; 

const LogoHeader: React.FC = () => (
  <div className="flex justify-between items-start mb-6">
    <img 
      src="https://i.postimg.cc/wB3sHyLj/LOGO.jpg" 
      alt="SJK(C) DESA JAYA" 
      className="h-20 md:h-24 w-auto object-contain"
    />
    <div className="text-center flex-1 px-2 md:px-4">
      <h1 className="text-lg md:text-xl font-bold text-gray-800">校内比赛报告书</h1>
      <h2 className="text-[10px] md:text-sm font-semibold text-gray-700 leading-tight mt-1">
        LAPORAN PERTANDINGAN AKTIVITI KO KURIKULUM / KO AKADEMIK DALAM SEKOLAH
      </h2>
      <h2 className="text-base md:text-lg font-bold text-blue-800 mt-1">SJK(C) DESA JAYA</h2>
    </div>
    <img 
      src="https://i.postimg.cc/sfKyPnbc/TS25.jpg" 
      alt="TS25 Logo" 
      className="h-20 md:h-24 w-auto object-contain"
    />
  </div>
);

const App: React.FC = () => {
  // Load initial data from localStorage if exists
  const getInitialData = (): ReportData => {
    const saved = localStorage.getItem('current_report_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, images: [] }; // Don't save images in localStorage to avoid quota issues
      } catch (e) {
        console.error("Error parsing saved draft", e);
      }
    }
    return {
      namaPertandingan: '',
      guruBertanggungjawab: '',
      disahkanOleh: '',
      jawatanDisahkanOleh: '',
      tarikh: '',
      masa: '',
      tempat: '',
      sasaran: '',
      t4L: '', t4P: '',
      t5L: '', t5P: '',
      t6L: '', t6P: '',
      kekuatan: '',
      kelemahan: '',
      cadangan: '',
      images: [],
    };
  };

  const [formData, setFormData] = useState<ReportData>(getInitialData());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [driveScriptUrl, setDriveScriptUrl] = useState(localStorage.getItem('drive_script_url') || GOOGLE_APPS_SCRIPT_URL);
  
  const templateRef = useRef<HTMLDivElement>(null);

  // Auto-save draft to localStorage (excluding images)
  useEffect(() => {
    const { images, ...dataToSave } = formData;
    localStorage.setItem('current_report_draft', JSON.stringify(dataToSave));
  }, [formData]);

  useEffect(() => {
    if (driveScriptUrl && driveScriptUrl !== "MASUKKAN_LINK_APPS_SCRIPT_ANDA_DI_SINI") {
      localStorage.setItem('drive_script_url', driveScriptUrl);
    }
  }, [driveScriptUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: string[] = [];
      const filesArray = (Array.from(files) as File[]).slice(0, 4 - formData.images.length);
      
      filesArray.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          if (newImages.length === filesArray.length) {
            setFormData(prev => ({
              ...prev,
              images: [...prev.images, ...newImages].slice(0, 4)
            }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const clearForm = () => {
    if (window.confirm("Adakah anda pasti mahu mengosongkan borang ini?")) {
      setFormData({
        namaPertandingan: '',
        guruBertanggungjawab: '',
        disahkanOleh: '',
        jawatanDisahkanOleh: '',
        tarikh: '',
        masa: '',
        tempat: '',
        sasaran: '',
        t4L: '', t4P: '',
        t5L: '', t5P: '',
        t6L: '', t6P: '',
        kekuatan: '',
        kelemahan: '',
        cadangan: '',
        images: [],
      });
      localStorage.removeItem('current_report_draft');
    }
  };

  const generateWithAI = async () => {
    if (!formData.namaPertandingan) {
      alert("Sila masukkan Nama Pertandingan terlebih dahulu untuk menjana cadangan AI.");
      return;
    }
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sebagai guru pembimbing sekolah rendah SJKC, bantu saya menulis bahagian Kekuatan (3 poin), Kelemahan (2 poin) dan Cadangan (2 poin) untuk laporan aktiviti: "${formData.namaPertandingan}". Berikan jawapan profesional dalam Bahasa Melayu.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              kekuatan: { type: Type.STRING },
              kelemahan: { type: Type.STRING },
              cadangan: { type: Type.STRING },
            },
            required: ["kekuatan", "kelemahan", "cadangan"],
          }
        }
      });
      const result = JSON.parse(response.text || '{}');
      setFormData(prev => ({
        ...prev,
        kekuatan: result.kekuatan || prev.kekuatan,
        kelemahan: result.kelemahan || prev.kelemahan,
        cadangan: result.cadangan || prev.cadangan,
      }));
    } catch (error) {
      console.error("AI Error:", error);
      alert("Gagal menjana kandungan AI. Sila isi secara manual.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const processPDF = async (mode: 'download' | 'drive') => {
    if (!templateRef.current) return;
    
    if (mode === 'drive' && (!driveScriptUrl || driveScriptUrl === "MASUKKAN_LINK_APPS_SCRIPT_ANDA_DI_SINI")) {
      setShowSettings(true);
      alert("Sila hubungi admin untuk menetapkan link Google Apps Script.");
      return;
    }

    setIsGenerating(true);
    if (mode === 'drive') setIsUploading(true);

    try {
      const element = templateRef.current;
      const canvas = await (window as any).html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const filename = `Laporan_${formData.namaPertandingan.replace(/\s+/g, '_') || 'Aktiviti'}.pdf`;

      if (mode === 'download') {
        pdf.save(filename);
      } else {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const response = await fetch(driveScriptUrl, {
          method: 'POST',
          body: JSON.stringify({
            base64: pdfBase64,
            filename: filename
          }),
        });
        const result = await response.json();
        if (result.status === 'success') {
          alert("Berjaya! Laporan telah dihantar ke Google Drive Sekolah.");
        } else {
          throw new Error(result.message || "Ralat muat naik.");
        }
      }
    } catch (error) {
      console.error("PDF Process failed", error);
      alert("Proses gagal. Sila pastikan sambungan internet stabil.");
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-100 flex justify-center items-start">
      <style>{`
        #pdf-template {
          position: fixed;
          left: -9999px;
          top: 0;
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          background: white;
          color: black;
          font-family: Arial, sans-serif;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .report-table th, .report-table td {
          border: 1px solid black;
          padding: 8px;
          text-align: left;
          vertical-align: top;
          font-size: 11px;
        }
        .report-table th {
          background-color: #f3f4f6;
          width: 30%;
          font-weight: bold;
        }
      `}</style>

      {/* Settings Panel Button (Only for Admin) */}
      <button 
        onClick={() => setShowSettings(!showSettings)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-all no-print"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Konfigurasi Admin</h3>
            <p className="text-xs text-gray-500 mb-4">Masukkan URL Google Apps Script untuk menghubungkan borang ke Drive.</p>
            <input 
              type="text" 
              value={driveScriptUrl} 
              onChange={(e) => setDriveScriptUrl(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4 text-sm font-mono"
              placeholder="https://script.google.com/..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded">Tutup</button>
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-6 md:p-10 no-print">
        <LogoHeader />
        
        <div className="flex justify-between items-center mb-6 pb-2 border-b">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Maklumat Laporan</h3>
          <button onClick={clearForm} className="text-xs text-red-500 hover:underline">Kosongkan Borang</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nama Pertandingan / Aktiviti 比赛项目</label>
              <input type="text" name="namaPertandingan" value={formData.namaPertandingan} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Guru Bertanggungjawab 负责老师</label>
              <input type="text" name="guruBertanggungjawab" value={formData.guruBertanggungjawab} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Disahkan Oleh (Nama)</label>
                <input type="text" name="disahkanOleh" value={formData.disahkanOleh} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Jawatan Pengesah</label>
                <input type="text" name="jawatanDisahkanOleh" value={formData.jawatanDisahkanOleh} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tarikh 日期</label>
                <input type="date" name="tarikh" value={formData.tarikh} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Masa 时间</label>
                <input type="text" name="masa" value={formData.masa} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Cth: 8:00 AM" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tempat 地点</label>
                <input type="text" name="tempat" value={formData.tempat} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Sasaran 目标</label>
                <input type="text" name="sasaran" value={formData.sasaran} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <label className="block text-xs font-bold text-blue-800 mb-3 uppercase">Statistik Murid 参与学生</label>
              {[4, 5, 6].map(yr => (
                <div key={yr} className="flex items-center justify-between mb-2 last:mb-0">
                  <span className="text-sm font-semibold text-blue-700">Tahun {yr}:</span>
                  <div className="flex gap-2">
                    <input type="text" name={`t${yr}L`} value={(formData as any)[`t${yr}L`]} onChange={handleInputChange} placeholder="L" className="w-14 p-1.5 bg-white border border-blue-200 rounded text-center text-sm" />
                    <input type="text" name={`t${yr}P`} value={(formData as any)[`t${yr}P`]} onChange={handleInputChange} placeholder="P" className="w-14 p-1.5 bg-white border border-blue-200 rounded text-center text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-gray-500 uppercase">Analisis Aktiviti</label>
              <button 
                onClick={generateWithAI} 
                disabled={isAiLoading || !formData.namaPertandingan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-full hover:bg-purple-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                {isAiLoading ? '⌛ MENJANA...' : '✨ CADANGAN AI'}
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Kekuatan 优点</label>
                <textarea name="kekuatan" value={formData.kekuatan} onChange={handleInputChange} rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Kelemahan 缺点</label>
                <textarea name="kelemahan" value={formData.kelemahan} onChange={handleInputChange} rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Cadangan 建议</label>
                <textarea name="cadangan" value={formData.cadangan} onChange={handleInputChange} rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <label className="block text-xs font-bold text-gray-500 mb-4 uppercase">Lampiran Gambar (Maksimum 4)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formData.images.map((img, idx) => (
              <div key={idx} className="relative group aspect-[4/3] rounded-xl overflow-hidden shadow-md border border-gray-200">
                <img src={img} className="w-full h-full object-cover" alt="Lampiran" />
                <button 
                  onClick={() => removeImage(idx)} 
                  className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {formData.images.length < 4 && (
              <label className="aspect-[4/3] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all text-gray-400 hover:text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] font-bold">TAMBAH GAMBAR</span>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col md:flex-row gap-4">
          <button 
            onClick={() => processPDF('download')} 
            disabled={isGenerating} 
            className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm tracking-widest hover:bg-black transition-all shadow-lg hover:shadow-gray-300 active:scale-95 disabled:opacity-50"
          >
            {isGenerating && !isUploading ? '⌛ SEDANG MEMPROSES...' : 'MUAT TURUN PDF'}
          </button>
          <button 
            onClick={() => processPDF('drive')} 
            disabled={isGenerating} 
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm tracking-widest hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                MENGHANTAR KE DRIVE...
              </>
            ) : (
              'JANA & HANTAR KE DRIVE'
            )}
          </button>
        </div>
        
        <p className="mt-6 text-center text-[10px] text-gray-400 font-medium italic">
          Draft anda disimpan secara automatik di dalam pelayar ini.
        </p>
      </div>

      {/* HIDDEN PDF TEMPLATE (RENDERED ONCE FOR GENERATION) */}
      <div id="pdf-template" ref={templateRef}>
        <div className="flex justify-between items-center border-b-[1.5pt] border-black pb-3 mb-4">
          <img src="https://i.postimg.cc/wB3sHyLj/LOGO.jpg" alt="Logo" className="h-16" />
          <div className="text-center px-4">
            <h1 className="text-lg font-bold">校内比赛报告书</h1>
            <p className="text-[8pt] font-semibold uppercase leading-tight">LAPORAN PERTANDINGAN AKTIVITI KO KURIKULUM / KO AKADEMIK DALAM SEKOLAH</p>
            <h2 className="text-base font-bold mt-1">SJK(C) DESA JAYA</h2>
          </div>
          <img src="https://i.postimg.cc/sfKyPnbc/TS25.jpg" alt="TS25" className="h-16" />
        </div>

        <table className="report-table">
          <tbody>
            <tr><th>Nama Pertandingan / Aktiviti 比赛项目</th><td className="font-bold">{formData.namaPertandingan}</td></tr>
            <tr><th>Guru Bertanggungjawab 负责老师</th><td>{formData.guruBertanggungjawab}</td></tr>
            <tr><th>Tarikh 日期</th><td>{formData.tarikh}</td></tr>
            <tr><th>Masa 时间</th><td>{formData.masa}</td></tr>
            <tr><th>Tempat 地点</th><td>{formData.tempat}</td></tr>
            <tr><th>Sasaran 目标</th><td>{formData.sasaran}</td></tr>
            <tr>
              <th>Bilangan Murid Terlibat 参与学生</th>
              <td className="p-0">
                <div className="p-2 border-b border-black">Tahun 4 : L ( {formData.t4L || '0'} ) &nbsp;&nbsp; P ( {formData.t4P || '0'} )</div>
                <div className="p-2 border-b border-black">Tahun 5 : L ( {formData.t5L || '0'} ) &nbsp;&nbsp; P ( {formData.t5P || '0'} )</div>
                <div className="p-2">Tahun 6 : L ( {formData.t6L || '0'} ) &nbsp;&nbsp; P ( {formData.t6P || '0'} )</div>
              </td>
            </tr>
            <tr><th>Kekuatan 优点</th><td className="whitespace-pre-wrap leading-relaxed text-[10px]">{formData.kekuatan}</td></tr>
            <tr><th>Kelemahan 缺点</th><td className="whitespace-pre-wrap leading-relaxed text-[10px]">{formData.kelemahan}</td></tr>
            <tr><th>Cadangan 建议</th><td className="whitespace-pre-wrap leading-relaxed text-[10px]">{formData.cadangan}</td></tr>
          </tbody>
        </table>

        {formData.images.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[10px] font-bold border-b border-black mb-2 uppercase tracking-wide">Lampiran Gambar Aktiviti:</h3>
            <div className="grid grid-cols-2 gap-3">
              {formData.images.map((img, idx) => (
                <div key={idx} className="border border-black p-0.5 aspect-[4/3] flex items-center justify-center overflow-hidden">
                  <img src={img} className="w-full h-full object-cover" alt="Lampiran" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex justify-between text-[10px] px-2">
          <div className="text-center w-1/3">
            <p className="font-semibold mb-12 italic text-gray-500">Disediakan Oleh:</p>
            <div className="border-t border-black pt-1">
              <p className="font-bold uppercase">{formData.guruBertanggungjawab || '.............................'}</p>
              <p className="text-[8px] mt-1">(Guru Bertanggungjawab)</p>
            </div>
          </div>
          <div className="text-center w-1/3">
            <p className="font-semibold mb-12 italic text-gray-500">Disahkan Oleh:</p>
            <div className="border-t border-black pt-1">
              <p className="font-bold uppercase">{formData.disahkanOleh || '.............................'}</p>
              <p className="text-[8px] mt-1">({formData.jawatanDisahkanOleh || 'Guru Besar'})</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
