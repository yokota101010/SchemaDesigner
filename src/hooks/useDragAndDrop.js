import { useState, useCallback, useRef } from 'react';
import { getTableRect, generateOrthogonalPath } from '../utils/layoutUtils';

export const useDragAndDrop = (tables, setTables, relationships, viewOffset, setViewOffset) => {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const dragReqRef = useRef(null);
  const lastStateUpdateRef = useRef(0);
  const latestDragPosRef = useRef(null);

  const handleDragStart = (e, tableId, canvasRef, setSelectedRelId) => {
    if (e.target.closest('input') || e.target.closest('button') || e.target.closest('select') || e.target.closest('textarea')) return;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    if (tableId) {
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

  const handleDragMove = useCallback((e, canvasRef) => {
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

            const newX = mouseX - dragOffset.x - viewOffset.x;
            const newY = mouseY - dragOffset.y - viewOffset.y;

            const tableEl = document.getElementById(`table-${draggingId}`);
            if (tableEl) {
                tableEl.style.transform = `translate(${newX + viewOffset.x}px, ${newY + viewOffset.y}px)`;
            }
            latestDragPosRef.current = { x: newX, y: newY };

            // Update relationship paths directly in DOM
            relationships.forEach(rel => {
                if (rel.from === draggingId || rel.to === draggingId) {
                    const fromTable = tables.find(t => t.id === rel.from);
                    const toTable = tables.find(t => t.id === rel.to);
                    if (!fromTable || !toTable) return;

                    const getRect = (table) => {
                        const dragPos = table.id === draggingId ? { x: newX, y: newY } : null;
                        return getTableRect(table, viewOffset, dragPos);
                    };

                    const fromRect = getRect(fromTable);
                    const toRect = getRect(toTable);
                    const isChildBelow = toRect.y > fromRect.y;

                    const incomingRels = relationships.filter(r => r.to === rel.to);
                    const sortedIncomingRels = incomingRels.sort((a, b) => {
                        const tableA = tables.find(t => t.id === a.from);
                        const tableB = tables.find(t => t.id === b.from);
                        const ya = tableA?.id === draggingId ? newY : (tableA?.y || 0);
                        const yb = tableB?.id === draggingId ? newY : (tableB?.y || 0);
                        return ya - yb;
                    });
                    
                    const index = sortedIncomingRels.findIndex(r => r.id === rel.id);
                    const total = incomingRels.length;
                    
                    const gap = 15;
                    const yOffset = (index - (total - 1) / 2) * gap;

                    const startX = fromRect.x + 24; 
                    // テーブルの境界から 8px 離れた位置を、関連線（および横棒マーカー）の出発点にします
                    const startY = isChildBelow ? (fromRect.y + fromRect.height + 8) : (fromRect.y - 8);
                    const endX = toRect.x;
                    const endY = toRect.y + toRect.height / 2 + yOffset;

                    // 共通ユーティリティを使用して直角角丸パスデータを生成
                    const pathData = generateOrthogonalPath(startX, startY, endX, endY, isChildBelow);
                    
                    const gEl = document.getElementById(`rel-${rel.id}`);
                    if (gEl) {
                        const paths = gEl.querySelectorAll('path');
                        const isIdentifying = rel.type === 'identifying';
                        const dash = isIdentifying ? "none" : "5,5";
                        paths.forEach(p => {
                            p.setAttribute('d', pathData);
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
        const finalPos = latestDragPosRef.current;
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
