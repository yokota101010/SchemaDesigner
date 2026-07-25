import { useState, useCallback, useRef } from 'react';
import { calculateRelationshipPath } from '../utils/layoutUtils';
import { Table, Relationship } from '../../../../domain/models';

export const useDragAndDrop = (
  tables: Table[],
  setTables: React.Dispatch<React.SetStateAction<Table[]>>,
  relationships: Relationship[],
  viewOffset: { x: number; y: number },
  setViewOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragReqRef = useRef<number | null>(null);
  const lastStateUpdateRef = useRef<number>(0);
  const latestDragPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = (
    e: any,
    tableId: string | null,
    canvasRef: React.RefObject<HTMLDivElement | null>,
    setSelectedRelId?: (id: string | null) => void
  ) => {
    if (e.target.closest('input') || e.target.closest('button') || e.target.closest('select') || e.target.closest('textarea')) return;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    if (tableId && canvasRef.current) {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        if (setSelectedRelId) setSelectedRelId(null);
        
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        setDragOffset({
          x: mouseX - (table.x + viewOffset.x),
          y: mouseY - (table.y + viewOffset.y)
        });
        setDraggingId(tableId);

    } else {
        setIsPanning(true);
        setLastMousePos({ x: clientX, y: clientY });
    }
  };

  const handleDragMove = useCallback((e: any, canvasRef: React.RefObject<HTMLDivElement | null>) => {
    if (!draggingId && !isPanning) return;
    e.preventDefault();

    if (dragReqRef.current) return;

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    dragReqRef.current = requestAnimationFrame(() => {
        dragReqRef.current = null;
        if (draggingId && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = clientX - rect.left;
            const mouseY = clientY - rect.top;

            const GRID_SIZE_X = 20 * 6; // 6コマ (120px) 単位
            const OFFSET_X = 20 * 2;     // 開始位置: 2コマ目 (40px)
            const GRID_SIZE_Y = 20;     // 1コマ (20px) 単位
            const rawX = mouseX - dragOffset.x - viewOffset.x;
            const rawY = mouseY - dragOffset.y - viewOffset.y;

            const newX = OFFSET_X + Math.round((rawX - OFFSET_X) / GRID_SIZE_X) * GRID_SIZE_X;
            const newY = Math.round(rawY / GRID_SIZE_Y) * GRID_SIZE_Y;

            const tableEl = document.getElementById(`table-${draggingId}`);
            if (tableEl) {
                tableEl.style.transform = `translate(${newX + viewOffset.x}px, ${newY + viewOffset.y}px)`;
            }
            latestDragPosRef.current = { x: newX, y: newY };

            // Update relationship paths directly in DOM
            relationships.forEach(rel => {
                if (rel.from === draggingId || rel.to === draggingId) {
                    const pathInfo = calculateRelationshipPath(
                        rel, tables, relationships, viewOffset, 
                        draggingId, { x: newX, y: newY }
                    );
                    if (!pathInfo) return;

                    const gEl = document.getElementById(`rel-${rel.id}`);
                    if (gEl) {
                        const paths = gEl.querySelectorAll('path');
                        const dash = pathInfo.isIdentifying ? "none" : "5,5";
                        paths.forEach(p => {
                            p.setAttribute('d', pathInfo.pathData);
                            p.setAttribute('stroke-dasharray', dash);
                        });
                    }
                }
            });

            const now = Date.now();
            if (!lastStateUpdateRef.current || now - lastStateUpdateRef.current > 100) {
                setTables(prev => prev.map(t => t.id === draggingId ? { ...t, x: newX, y: newY } : t));
                lastStateUpdateRef.current = now;
            }
        } else if (isPanning) {
            const now = Date.now();
            if (!lastStateUpdateRef.current || now - lastStateUpdateRef.current > 50) {
                const dx = clientX - lastMousePos.x;
                const dy = clientY - lastMousePos.y;
                setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                setLastMousePos({ x: clientX, y: clientY });
                lastStateUpdateRef.current = now;
            }
        }
    });
  }, [draggingId, isPanning, dragOffset, lastMousePos, viewOffset, tables, relationships, setTables, setViewOffset]);

  const handleDragEnd = () => {
    if (draggingId && latestDragPosRef.current) {
        const GRID_SIZE_X = 20 * 6;
        const OFFSET_X = 20 * 2;
        const GRID_SIZE_Y = 20;
        const finalPos = {
            x: OFFSET_X + Math.round((latestDragPosRef.current.x - OFFSET_X) / GRID_SIZE_X) * GRID_SIZE_X,
            y: Math.round(latestDragPosRef.current.y / GRID_SIZE_Y) * GRID_SIZE_Y
        };
        setTables(prev => prev.map(t => t.id === draggingId ? { ...t, x: finalPos.x, y: finalPos.y } : t));
    }
    setDraggingId(null);
    setIsPanning(false);
    latestDragPosRef.current = null;
  };

  return {
    draggingId, setDraggingId,
    isPanning, setIsPanning,
    handleDragStart, handleDragMove, handleDragEnd
  };
};
