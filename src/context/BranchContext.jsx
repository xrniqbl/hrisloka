import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import * as branchService from '../services/branchService';

const BranchContext = createContext({});

export const useBranch = () => useContext(BranchContext);

export function BranchProvider({ children }) {
    const { employee } = useAuth();
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBranches();
    }, []);

    // Auto-lock branch for branch_admin
    useEffect(() => {
        if (employee?.role === 'branch_admin' && employee?.branch_id) {
            setSelectedBranchId(employee.branch_id);
        }
    }, [employee]);

    const fetchBranches = async () => {
        setLoading(true);
        const { data } = await branchService.getActiveBranches();
        setBranches(data || []);
        setLoading(false);
    };

    const isBranchAdmin = employee?.role === 'branch_admin';
    const isAdmin = employee?.role === 'admin';

    const value = {
        branches,
        selectedBranchId,
        setSelectedBranchId: isBranchAdmin ? () => { } : setSelectedBranchId, // lock for branch_admin
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
