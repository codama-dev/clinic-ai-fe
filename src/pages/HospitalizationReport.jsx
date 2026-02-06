import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import HospitalizationForm from "../components/hospitalization/HospitalizationForm";
import { createPageUrl } from "@/utils";

export default function HospitalizationReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [animal, setAnimal] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState('read_only');

  // Get animal ID from URL params
  const searchParams = new URLSearchParams(location.search);
  const animalId = searchParams.get('id');
  const mode = searchParams.get('mode') || 'view'; // 'create', 'edit', 'view'

  useEffect(() => {
    loadData();
  }, [animalId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load current user
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Load all users if admin
      if (user.role === 'admin') {
        try {
          const usersData = await base44.entities.User.list();
          setAllUsers(usersData);
        } catch (error) {
          console.warn("Could not fetch all users:", error);
          setAllUsers([]);
        }
      }

      // Load animal data if editing/viewing
      if (animalId && mode !== 'create') {
        const animals = await base44.entities.HospitalizedAnimal.list();
        const foundAnimal = animals.find(a => a.id === animalId);
        
        if (foundAnimal) {
          setAnimal(foundAnimal);
          
          // Determine access level
          const isAdmin = user.role === 'admin';
          let newAccessLevel;
          
          if (mode === 'create') {
            newAccessLevel = 'full';
          } else if (foundAnimal.status === 'active') {
            newAccessLevel = 'full';
          } else {
            newAccessLevel = isAdmin ? 'full' : 'read_only';
          }
          
          setAccessLevel(newAccessLevel);
        } else {
          // Animal not found, redirect back
          navigate(createPageUrl('Hospitalization'));
        }
      } else if (mode === 'create') {
        // Creating new animal
        setAnimal(null);
        setAccessLevel('full');
      }
    } catch (error) {
      console.error("Error loading data:", error);
      navigate(createPageUrl('Hospitalization'));
    }
    setIsLoading(false);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (animal) {
        await base44.entities.HospitalizedAnimal.update(animal.id, formData);
      } else {
        await base44.entities.HospitalizedAnimal.create(formData);
      }
      // Navigate back to main page
      navigate(createPageUrl('Hospitalization'));
    } catch (error) {
      console.error("Error saving animal data:", error);
    }
  };

  const handleCancel = () => {
    navigate(createPageUrl('Hospitalization'));
  };

  // Function to refresh data for currently open animal
  const handleDataRefresh = async () => {
    if (!animal?.id) return;
    
    try {
      const animals = await base44.entities.HospitalizedAnimal.list();
      const updatedAnimal = animals.find(a => a.id === animal.id);
      
      if (updatedAnimal) {
        setAnimal(updatedAnimal);
      }
    } catch (error) {
      console.error("Error refreshing animal data:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header with back button */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          חזרה לרשימת אשפוזים
        </Button>
        
        <div className="flex justify-center mb-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d7b52d0d33b12757415b4f/7c4ff2a29_-.png"
            alt="LoVeT לוגו"
            className="h-20 w-auto"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-center">
          {animal ? `דוח אשפוז: ${animal.animal_name}` : 'פתיחת דוח אשפוז חדש'}
        </h1>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        <HospitalizationForm
          animal={animal}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          accessLevel={accessLevel}
          currentUser={currentUser}
          allUsers={allUsers}
          onDataRefresh={handleDataRefresh}
        />
      </Card>
    </div>
  );
}