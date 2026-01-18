
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Link, Image as ImageIcon, Loader2 } from 'lucide-react';

interface CoverUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (result: { file?: File; url?: string }) => void;
}

export const CoverUploadModal: React.FC<CoverUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('file');
      setUrl('');
      setSelectedFile(null);
      setPreview(null);
      setIsCheckingUrl(false);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setPreview(null);
  };

  const checkUrl = () => {
    if (!url) return;
    setIsCheckingUrl(true);
    const img = new Image();
    img.onload = () => {
      setPreview(url);
      setIsCheckingUrl(false);
    };
    img.onerror = () => {
      setIsCheckingUrl(false);
      // Optional: show error
    };
    img.src = url;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'file' && selectedFile) {
      onSubmit({ file: selectedFile });
    } else if (activeTab === 'url' && url) {
      onSubmit({ url });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <ImageIcon size={20} className="text-indigo-500" />
            Update Album Cover
          </h2>

          {/* Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'file' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Upload size={14} />
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'url' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Link size={14} />
              Image URL
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {activeTab === 'file' ? (
              <div 
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 
                  ${isDragging 
                    ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' 
                    : 'border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50'
                  }
                `}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                {preview ? (
                  <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-lg shadow-lg mb-2 pointer-events-none" />
                ) : (
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-indigo-500/20' : 'bg-zinc-900'}`}>
                    <Upload size={24} className={isDragging ? 'text-indigo-400' : 'text-zinc-600'} />
                  </div>
                )}
                <p className={`text-sm font-medium transition-colors ${isDragging ? 'text-indigo-400' : 'text-zinc-400'}`}>
                  {selectedFile ? selectedFile.name : (isDragging ? "Drop image here" : "Click or Drag image here")}
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  JPG, PNG, GIF up to 5MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                 <div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={url}
                            onChange={handleUrlChange}
                            onBlur={checkUrl}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            autoFocus
                        />
                    </div>
                    <p className="text-zinc-600 text-[10px] mt-1.5 ml-1">Paste a direct link to an image.</p>
                 </div>

                 {preview && (
                    <div className="flex justify-center">
                         <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-lg shadow-lg" />
                    </div>
                 )}
                 {isCheckingUrl && (
                     <div className="flex justify-center text-zinc-500 text-xs">
                         <Loader2 size={14} className="animate-spin mr-2" /> Checking image...
                     </div>
                 )}
              </div>
            )}

            <button
              type="submit"
              disabled={(activeTab === 'file' && !selectedFile) || (activeTab === 'url' && !url)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <ImageIcon size={16} />
              Set Album Cover
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
