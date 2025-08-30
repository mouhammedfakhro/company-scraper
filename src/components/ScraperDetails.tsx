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
      alert('Vänligen ange en giltig e-postadress');
      return;
    }

    if (!isValidEmail(newEmail.trim())) {
      alert('Vänligen ange ett giltigt e-postformat');
      return;
    }

    if (emails.includes(newEmail.trim())) {
      alert('Denna e-postadress finns redan i listan');
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
      alert('Kunde inte lägga till e-postadress. Vänligen försök igen.');
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
        alert('Kunde inte ta bort e-postadress. Vänligen försök igen.');
      }
    }
  };

  const handleAddCode = async () => {
    if (!newCode.trim()) {
      alert('Vänligen ange en giltig branschkod');
      return;
    }

    if (!newCodeName.trim()) {
      alert('Vänligen ange ett namn/titel för denna kod');
      return;
    }

    if (proffIndustryCodes.some(pic => pic.code === newCode.trim())) {
      alert('Denna kod finns redan i listan');
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


      if (newProffIndustryCode) {
        // Add to the current list
        const updatedCodes = [...proffIndustryCodes, newProffIndustryCode];
        await onCodesChange(updatedCodes);
        setNewCode('');
        setNewCodeName('');
      }
    } catch (error) {
      console.error('Error adding code:', error);
      alert('Kunde inte lägga till kod. Vänligen försök igen.');
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
        alert('Kunde inte ta bort kod. Vänligen försök igen.');
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Scraper-inställningar</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Hantera branschkoder</h2>
        <p className="text-gray-600 mb-4">
          Lägg till branschkoder som används när företag söks. 
          Example: "10241621"
        </p>
        
        <div className="space-y-3 mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Ange branschkod (t.ex. 10241621)"
              className="flex-1 border border-gray-300 rounded-lg p-2"
            />
            <input
              type="text"
              value={newCodeName}
              onChange={(e) => setNewCodeName(e.target.value)}
              placeholder="Ange titel/namn (t.ex. Mjukvaruutveckling)"
              className="flex-1 border border-gray-300 rounded-lg p-2"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCode()}
            />
          </div>
          <button
            onClick={handleAddCode}
            disabled={isAdding}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {isAdding ? 'Lägger till...' : 'Lägg till kod'}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Nuvarande branschkoder ({proffIndustryCodes.length})
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
                  Ta bort
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg">
            Inga branschkoder konfigurerade. Lägg till några koder ovan för att börja söka.
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Branschkoder - Så här fungerar det:</h3>
        <ul className="text-blue-700 space-y-1">
          <li>• Lägg till branschkoder som representerar olika branschkategorier</li>
          <li>• När sökning görs i "Nya Företag" filtreras företag efter den valda koden</li>
          <li>• Du kan hantera flera koder och ta bort dem när de inte längre behövs</li>
          <li>• Alla sökta företag sparas i "Sparade Företag"</li>
        </ul>
      </div>

      {/* Email Management Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Hantera e-postadresser</h2>
        <p className="text-gray-600 mb-4">
          Lägg till e-postadresser för aviseringar och varningar relaterade till företagsökning.
        </p>
        
        <div className="flex space-x-2 mb-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Ange e-postadress (t.ex. användare@exempel.com)"
            className="flex-1 border border-gray-300 rounded-lg p-2 max-w-md"
            onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
          />
          <button
            onClick={handleAddEmail}
            disabled={isAddingEmail}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {isAddingEmail ? 'Lägger till...' : 'Lägg till e-post'}
          </button>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">
            Nuvarande e-postadresser ({emails.length})
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
                    Ta bort
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg">
              Inga e-postadresser konfigurerade. Lägg till några e-postadresser ovan för aviseringar.
            </div>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">E-postanvändning:</h3>
          <ul className="text-green-700 space-y-1">
            <li>• Ta emot aviseringar när sökning är slutförd</li>
            <li>• Få varningar för nya företag som matchar dina kriterier</li>
            <li>• E-postadresser lagras och hanteras säkert</li>
            <li>• Du kan lägga till flera e-postadresser för olika teammedlemmar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}