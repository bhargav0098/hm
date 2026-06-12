import api from './api';

export const parseResumeFile = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  
  const response = await api.post('/resume/parse', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};
