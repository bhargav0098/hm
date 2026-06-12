import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function AIResumeUpload({ onFileSelect, isParsing, parsedData, resetData }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    onFileSelect(file);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="glass-card p-5 relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-purple" /> AI Resume Auto-Fill
        </h3>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Upload your existing resume and let our AI extract your skills, experience, and education to automatically build your profile.
      </p>

      {!isParsing && !parsedData && (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
            isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`w-8 h-8 mx-auto mb-3 ${isDragActive ? 'text-primary-400' : 'text-slate-400'}`} />
          <p className="text-white font-medium text-sm mb-1">
            {isDragActive ? 'Drop your resume here...' : 'Click or drag your resume here'}
          </p>
          <p className="text-xs text-slate-500">Supports PDF and DOCX</p>
        </div>
      )}

      <AnimatePresence>
        {isParsing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center p-6 border border-white/10 rounded-xl bg-white/5"
          >
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
            <p className="text-white font-medium text-sm">Parsing resume with AI...</p>
            <p className="text-xs text-slate-400 text-center mt-2">Extracting skills, work experience, and structuring your profile.</p>
          </motion.div>
        )}

        {parsedData && !isParsing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="p-4 border border-accent-green/30 bg-accent-green/10 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-accent-green mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium text-sm mb-1">Extraction Complete</p>
                <p className="text-xs text-slate-400 mb-2">We found {parsedData.skillsExtracted} skills, {parsedData.experienceParsed} roles, and {parsedData.educationParsed} education entries.</p>
                <button 
                  onClick={resetData}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                >
                  Upload a different file
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
