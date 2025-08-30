'use client';

import { useState, useMemo } from 'react';
import { useFindFirstEmailHandler, useUpsertEmailHandler, useCreateProffIndustryCode, useDeleteProffIndustryCode } from '../lib/hooks';

interface ProffIndustryCode {
  id: string;
  code: string;
  name: string;
}

interface ScraperDetailsProps {
  proffIndustryCodes: ProffIndustryCode[];
  onCodesChange: (codes: ProffIndustryCode[]) => Promise<void>;
}

export default function ScraperDetails({ proffIndustryCodes, onCodesChange }: ScraperDetailsProps) {
  const [newCode, setNewCode] = useState('');
  const [newCodeName, setNewCodeName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);

  // ZenStack hooks for ProffIndustryCode management
  const createProffIndustryCode = useCreateProffIndustryCode();
  const deleteProffIndustryCode = useDeleteProffIndustryCode();

  // Fetch emails from database using ZenStack
  const { data: emailHandler } = useFindFirstEmailHandler();
  const upsertEmailHandler = useUpsertEmailHandler();

  const emails = useMemo(() => {
    return emailHandler?.emails || [];
  }, [emailHandler]);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      alert('Please enter a valid email address');
      return;
    }

    if (!isValidEmail(newEmail.trim())) {
      alert('Please enter a valid email format');
      return;
    }

    if (emails.includes(newEmail.trim())) {
      alert('This email is already in the list');
      return;
    }

    setIsAddingEmail(true);
    
    try {
      const updatedEmails = [...emails, newEmail.trim()];
      await upsertEmailHandler.mutateAsync({
        where: {
          id: emailHandler?.id || 'default-email-handler'
        },
        update: {
          emails: updatedEmails
        },
        create: {
          id: 'default-email-handler',
          emails: updatedEmails
        }
      });
      setNewEmail('');
    } catch (error) {
      console.error('Error adding email:', error);
      alert('Failed to add email. Please try again.');
    }
    
    setIsAddingEmail(false);
  };

  const handleDeleteEmail = async (emailToDelete: string) => {
    if (window.confirm(`Are you sure you want to delete the email "${emailToDelete}"?`)) {
      try {
        const updatedEmails = emails.filter(email => email !== emailToDelete);
        await upsertEmailHandler.mutateAsync({
          where: {
            id: emailHandler?.id || 'default-email-handler'
          },
          update: {
            emails: updatedEmails
          },
          create: {
            id: 'default-email-handler',
            emails: updatedEmails
          }
        });
      } catch (error) {
        console.error('Error deleting email:', error);
        alert('Failed to delete email. Please try again.');
      }
    }
  };

  const handleAddCode = async () => {
    if (!newCode.trim()) {
      alert('Please enter a valid ProfIndustryCode');
      return;
    }

    if (!newCodeName.trim()) {
      alert('Please enter a name/title for this code');
      return;
    }

    if (proffIndustryCodes.some(pic => pic.code === newCode.trim())) {
      alert('This code is already in the list');
      return;
    }

    setIsAdding(true);
    
    try {
      // Create the new ProffIndustryCode in database
      const newProffIndustryCode = await createProffIndustryCode.mutateAsync({
        data: {
          code: newCode.trim(),
          name: newCodeName.trim()
        }
      });

      console.log(newProffIndustryCode);

      if (newProffIndustryCode) {
        // Add to the current list
        const updatedCodes = [...proffIndustryCodes, newProffIndustryCode];
        await onCodesChange(updatedCodes);
        setNewCode('');
        setNewCodeName('');
      }
    } catch (error) {
      console.error('Error adding code:', error);
      alert('Failed to add code. Please try again.');
    }
    
    setIsAdding(false);
  };

  const handleDeleteCode = async (codeToDelete: ProffIndustryCode) => {
    if (window.confirm(`Are you sure you want to delete the code "${codeToDelete.code}" (${codeToDelete.name})?`)) {
      try {
        // Delete from database
        await deleteProffIndustryCode.mutateAsync({
          where: { id: codeToDelete.id }
        });

        // Remove from current list
        const updatedCodes = proffIndustryCodes.filter(code => code.id !== codeToDelete.id);
        await onCodesChange(updatedCodes);
      } catch (error) {
        console.error('Error deleting code:', error);
        alert('Failed to delete code. Please try again.');
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Scraper Details</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Manage ProfIndustryCode</h2>
        <p className="text-gray-600 mb-4">
          Add ProfIndustryCode that will be used when scraping companies. 
          Example: "10241621"
        </p>
        
        <div className="space-y-3 mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Enter ProfIndustryCode (e.g., 10241621)"
              className="flex-1 border border-gray-300 rounded-lg p-2"
            />
            <input
              type="text"
              value={newCodeName}
              onChange={(e) => setNewCodeName(e.target.value)}
              placeholder="Enter title/name (e.g., Software Development)"
              className="flex-1 border border-gray-300 rounded-lg p-2"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCode()}
            />
          </div>
          <button
            onClick={handleAddCode}
            disabled={isAdding}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {isAdding ? 'Adding...' : 'Add Code'}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Current ProfIndustryCode ({proffIndustryCodes.length})
        </h2>
        
        {proffIndustryCodes.length > 0 ? (
          <div className="space-y-2">
            {proffIndustryCodes.map((proffCode) => (
              <div
                key={proffCode.id}
                className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="flex-1">
                  <div className="font-mono text-lg font-semibold">{proffCode.code}</div>
                  <div className="text-gray-600 text-sm">{proffCode.name}</div>
                </div>
                <button
                  onClick={() => handleDeleteCode(proffCode)}
                  className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg">
            No ProfIndustryCode configured. Add some codes above to start scraping.
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">ProfIndustryCode - How it works:</h3>
        <ul className="text-blue-700 space-y-1">
          <li>• Add ProfIndustryCode that represent different industry categories</li>
          <li>• When scraping in "Nya Företag", companies will be filtered by the selected code</li>
          <li>• You can manage multiple codes and delete them when no longer needed</li>
          <li>• All scraped companies will be saved to "Sparade Företag"</li>
        </ul>
      </div>

      {/* Email Management Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Manage Email Addresses</h2>
        <p className="text-gray-600 mb-4">
          Add email addresses for notifications and alerts related to company scraping.
        </p>
        
        <div className="flex space-x-2 mb-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email address (e.g., user@example.com)"
            className="flex-1 border border-gray-300 rounded-lg p-2 max-w-md"
            onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
          />
          <button
            onClick={handleAddEmail}
            disabled={isAddingEmail}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {isAddingEmail ? 'Adding...' : 'Add Email'}
          </button>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">
            Current Email Addresses ({emails.length})
          </h3>
          
          {emails.length > 0 ? (
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg p-3"
                >
                  <span className="font-mono text-lg">{email}</span>
                  <button
                    onClick={() => handleDeleteEmail(email)}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg">
              No email addresses configured. Add some emails above for notifications.
            </div>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Email Usage:</h3>
          <ul className="text-green-700 space-y-1">
            <li>• Receive notifications when scraping is completed</li>
            <li>• Get alerts for new companies matching your criteria</li>
            <li>• Email addresses are securely stored and managed</li>
            <li>• You can add multiple emails for different team members</li>
          </ul>
        </div>
      </div>
    </div>
  );
}