import React from 'react';
import PersonnelSidebar from './PersonnelSidebar';

interface PersonnelLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const PersonnelLayout: React.FC<PersonnelLayoutProps> = ({
  children,
  title,
  description,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200">
            <PersonnelSidebar />
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex flex-col flex-1">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {description && (
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">
                      Lecteur: 192.168.10.50
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className="md:hidden">
        {/* Ici vous pourriez ajouter un menu mobile si nécessaire */}
      </div>
    </div>
  );
};

export default PersonnelLayout;
