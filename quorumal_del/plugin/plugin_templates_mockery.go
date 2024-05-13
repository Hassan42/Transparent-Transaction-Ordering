// Code generated by MockGen. DO NOT EDIT.
// Source: plugin_templates.go

// Package plugin is a generated GoMock package.
package plugin

import (
	reflect "reflect"

	qlight "github.com/ethereum/go-ethereum/plugin/qlight"
	gomock "github.com/golang/mock/gomock"
)

// MockQLightTokenManagerPluginTemplateInterface is a mock of QLightTokenManagerPluginTemplateInterface interface.
type MockQLightTokenManagerPluginTemplateInterface struct {
	ctrl     *gomock.Controller
	recorder *MockQLightTokenManagerPluginTemplateInterfaceMockRecorder
}

// MockQLightTokenManagerPluginTemplateInterfaceMockRecorder is the mock recorder for MockQLightTokenManagerPluginTemplateInterface.
type MockQLightTokenManagerPluginTemplateInterfaceMockRecorder struct {
	mock *MockQLightTokenManagerPluginTemplateInterface
}

// NewMockQLightTokenManagerPluginTemplateInterface creates a new mock instance.
func NewMockQLightTokenManagerPluginTemplateInterface(ctrl *gomock.Controller) *MockQLightTokenManagerPluginTemplateInterface {
	mock := &MockQLightTokenManagerPluginTemplateInterface{ctrl: ctrl}
	mock.recorder = &MockQLightTokenManagerPluginTemplateInterfaceMockRecorder{mock}
	return mock
}

// EXPECT returns an object that allows the caller to indicate expected use.
func (m *MockQLightTokenManagerPluginTemplateInterface) EXPECT() *MockQLightTokenManagerPluginTemplateInterfaceMockRecorder {
	return m.recorder
}

// Get mocks base method.
func (m *MockQLightTokenManagerPluginTemplateInterface) Get() (qlight.PluginTokenManager, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Get")
	ret0, _ := ret[0].(qlight.PluginTokenManager)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}

// Get indicates an expected call of Get.
func (mr *MockQLightTokenManagerPluginTemplateInterfaceMockRecorder) Get() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Get", reflect.TypeOf((*MockQLightTokenManagerPluginTemplateInterface)(nil).Get))
}

// ManagedPlugin mocks base method.
func (m *MockQLightTokenManagerPluginTemplateInterface) ManagedPlugin() managedPlugin {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ManagedPlugin")
	ret0, _ := ret[0].(managedPlugin)
	return ret0
}

// ManagedPlugin indicates an expected call of ManagedPlugin.
func (mr *MockQLightTokenManagerPluginTemplateInterfaceMockRecorder) ManagedPlugin() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ManagedPlugin", reflect.TypeOf((*MockQLightTokenManagerPluginTemplateInterface)(nil).ManagedPlugin))
}

// Start mocks base method.
func (m *MockQLightTokenManagerPluginTemplateInterface) Start() error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Start")
	ret0, _ := ret[0].(error)
	return ret0
}

// Start indicates an expected call of Start.
func (mr *MockQLightTokenManagerPluginTemplateInterfaceMockRecorder) Start() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Start", reflect.TypeOf((*MockQLightTokenManagerPluginTemplateInterface)(nil).Start))
}

// Stop mocks base method.
func (m *MockQLightTokenManagerPluginTemplateInterface) Stop() error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Stop")
	ret0, _ := ret[0].(error)
	return ret0
}

// Stop indicates an expected call of Stop.
func (mr *MockQLightTokenManagerPluginTemplateInterfaceMockRecorder) Stop() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Stop", reflect.TypeOf((*MockQLightTokenManagerPluginTemplateInterface)(nil).Stop))
}
