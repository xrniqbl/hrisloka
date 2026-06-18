// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as branchService from '../services/branchService';

const BranchContext = createContext({});

export const useBranch = () => useContext(BranchContext);

export function BranchProvider({ children }) {
  const { employee } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    // Scope branches to the current company
    const { data } = await branchService.getActiveBranches(employee?.company_id);
    setBranches(data || []);
    setLoading(false);
  }, [employee?.company_id]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Auto-lock branch for managers (manager role = branch-level access only)
  useEffect(() => {
    if (employee?.role === 'manager' && employee?.branch_id) {
      setSelectedBranchId(employee.branch_id);
    }
  }, [employee?.role, employee?.branch_id]);

  // 'manager' role = branch-scoped, cannot switch branches
  const isBranchAdmin = employee?.role === 'manager';
  // Full admin access: hr_admin, super_admin, founder
  const isAdmin = ['hr_admin', 'super_admin', 'founder'].includes(employee?.role);

  const value = {
    branches,
    selectedBranchId,
    setSelectedBranchId: isBranchAdmin ? () => {} : setSelectedBranchId, // lock for managers
    loading,
    isBranchAdmin,
    isAdmin,
    refetchBranches: fetchBranches,
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}
