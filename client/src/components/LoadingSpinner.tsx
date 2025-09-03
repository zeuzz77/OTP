import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'whatsapp' | 'overlay' | 'pulse' | 'dots';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'medium',
  variant = 'default'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-6 h-6';
      case 'large':
        return 'w-16 h-16';
      default:
        return 'w-10 h-10';
    }
  };

  const getContainerClasses = () => {
    const baseClasses = 'flex flex-col items-center justify-center';
    
    switch (variant) {
      case 'whatsapp':
        return `${baseClasses} min-h-screen bg-gradient-to-br from-whatsapp-primary to-whatsapp-secondary`;
      case 'overlay':
        return `${baseClasses} fixed inset-0 bg-black bg-opacity-50 z-50`;
      default:
        return `${baseClasses} py-8`;
    }
  };

  const getSpinnerColor = () => {
    switch (variant) {
      case 'whatsapp':
      case 'overlay':
        return 'border-white';
      default:
        return 'border-whatsapp-primary';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'whatsapp':
      case 'overlay':
        return 'text-white';
      default:
        return 'text-gray-600';
    }
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'pulse':
        return (
          <div className="relative">
            <div className={`${getSizeClasses()} ${getSpinnerColor()} border-4 border-solid border-opacity-30 rounded-full`}></div>
            <div className={`absolute inset-0 ${getSizeClasses()} ${getSpinnerColor()} border-4 border-solid border-t-transparent rounded-full animate-spin`}></div>
            <div className={`absolute inset-2 ${getSpinnerColor().replace('border-', 'bg-')} rounded-full animate-pulse`}></div>
          </div>
        );
      
      case 'dots':
        return (
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-whatsapp-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-whatsapp-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-whatsapp-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      default:
        return (
          <div className="relative">
            {/* Outer spinning ring */}
            <div className={`animate-spin ${getSizeClasses()} ${getSpinnerColor()} border-4 border-solid border-t-transparent rounded-full`}></div>
            
            {/* WhatsApp Logo in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg 
                className={`${size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-8 h-8' : 'w-5 h-5'} ${getTextColor()}`} 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.892 3.486"/>
              </svg>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={getContainerClasses()}>
      {/* Main Spinner */}
      <div className="mb-4">
        {renderSpinner()}
      </div>

      {/* Loading Message */}
      <p className={`text-sm font-medium ${getTextColor()} animate-pulse`}>
        {message}
      </p>

      {/* Loading Dots (only for non-dots variants) */}
      {variant !== 'dots' && (
        <div className="flex space-x-1 mt-3">
          <div className={`w-2 h-2 ${variant === 'whatsapp' || variant === 'overlay' ? 'bg-white' : 'bg-whatsapp-primary'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
          <div className={`w-2 h-2 ${variant === 'whatsapp' || variant === 'overlay' ? 'bg-white' : 'bg-whatsapp-primary'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
          <div className={`w-2 h-2 ${variant === 'whatsapp' || variant === 'overlay' ? 'bg-white' : 'bg-whatsapp-primary'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;
