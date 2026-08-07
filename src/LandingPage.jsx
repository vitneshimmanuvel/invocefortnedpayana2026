import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleAppSelection = (app) => {
    if (app === 'settlo') {
      navigate('/settlo/dashboard');
    } else if (app === 'payana') {
      navigate('/payana/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            Welcome to Your Business Suite
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose your application to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Settlo Card */}
          <div 
            onClick={() => handleAppSelection('settlo')}
            className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Settlo</h2>
              <p className="text-gray-600 mb-6">
                Complete invoice management system with analytics and reporting
              </p>
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Create & manage invoices</li>
                  <li>• Track payment status</li>
                  <li>• Analytics dashboard</li>
                  <li>• Invoice history</li>
                </ul>
              </div>
              <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Enter Settlo
              </button>
            </div>
          </div>

          {/* Payana Card */}
          <div 
            onClick={() => handleAppSelection('payana')}
            className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-2 border-transparent hover:border-green-500"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Payana</h2>
              <p className="text-gray-600 mb-6">
                Advanced payment processing and financial management platform
              </p>
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Payment processing</li>
                  <li>• Financial analytics</li>
                  <li>• Transaction management</li>
                  <li>• Revenue tracking</li>
                </ul>
              </div>
              <button className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                Enter Payana
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
